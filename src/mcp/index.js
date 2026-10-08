// MCP endpoint (Streamable HTTP, protocol 2025-06-18) mounted into the existing Express app at /mcp.
const express = require('express');
const cors = require('cors');
const { randomUUID, timingSafeEqual } = require('crypto');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { isInitializeRequest } = require('@modelcontextprotocol/sdk/types.js');

const verifyToken = require('../middlewares/auth');
const dbReady = require('../middlewares/dbReady');
const { registerTools } = require('./tools');
const pkg = require('../../package.json');

const SESSION_IDLE_MS = Number(process.env.MCP_SESSION_IDLE_MIN || 30) * 60 * 1000;

function buildServer() {
  const server = new McpServer(
    { name: 'fast-room-manager', version: pkg.version || '1.0.0' },
    {
      instructions:
        'Read-only access to a boarding-house (phòng trọ) management system: floors, rooms, tenants, contracts, monthly payments, ' +
        'dashboard/revenue reports and a RAG knowledge base (house rules, fees, deposit policy). Money is in VND. ' +
        'Payment month format is MM/YYYY. Use list_* tools to find ids, then get_* tools for details.',
    }
  );
  registerTools(server);
  return server;
}

const safeEqual = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Auth: a user JWT from POST /api/v1/auth/login (same as the REST API),
 * or the optional static MCP_API_KEY (handy for AI hosts, since JWTs expire).
 */
function mcpAuth(req, res, next) {
  const key = process.env.MCP_API_KEY;
  const header = req.headers.authorization || '';
  if (key && header.startsWith('Bearer ') && safeEqual(header.slice(7), key)) {
    req.user = { id: 'mcp-api-key' };
    return next();
  }
  return verifyToken(req, res, (err) => {
    if (err) {
      return res
        .status(401)
        .set('WWW-Authenticate', 'Bearer')
        .json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } });
    }
    next();
  });
}

const rpcError = (res, status, message, code = -32000) =>
  res.status(status).json({ jsonrpc: '2.0', id: null, error: { code, message } });

/** sessionId -> { transport, server, userId, lastSeen } */
const sessions = new Map();

function getSession(req, res) {
  const sid = req.headers['mcp-session-id'];
  const entry = sid && sessions.get(sid);
  if (!entry) return null;
  // A session belongs to the user who initialized it.
  if (entry.userId !== req.user.id) {
    rpcError(res, 403, 'Session belongs to another user');
    return false;
  }
  entry.lastSeen = Date.now();
  return entry;
}

// Close sessions that have been idle too long.
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [sid, entry] of sessions) {
    if (now - entry.lastSeen > SESSION_IDLE_MS) {
      sessions.delete(sid);
      entry.transport.close().catch(() => {});
    }
  }
}, 60 * 1000);
sweeper.unref();

const router = express.Router();

// Browser-based clients (e.g. MCP Inspector in direct mode) need to read the session header.
router.use(cors({ origin: true, credentials: true, exposedHeaders: ['Mcp-Session-Id', 'WWW-Authenticate'] }));
router.use(mcpAuth);
router.use(dbReady);
router.use(express.json({ limit: '1mb' }));

router.post('/', async (req, res) => {
  try {
    let entry = getSession(req, res);
    if (entry === false) return;

    if (!entry) {
      if (req.headers['mcp-session-id']) return rpcError(res, 404, 'Session not found');
      if (!isInitializeRequest(req.body)) return rpcError(res, 400, 'Bad Request: No valid session ID provided');

      const server = buildServer();
      const userId = req.user.id;
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          sessions.set(sid, { transport, server, userId, lastSeen: Date.now() });
        },
        onsessionclosed: (sid) => {
          sessions.delete(sid);
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
      await server.connect(transport);
      entry = { transport };
    }

    await entry.transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('[MCP] POST error:', err);
    if (!res.headersSent) rpcError(res, 500, 'Internal server error', -32603);
  }
});

const sessionRequest = async (req, res) => {
  const entry = getSession(req, res);
  if (entry === false) return;
  if (!entry) return rpcError(res, req.headers['mcp-session-id'] ? 404 : 400, 'Invalid or missing session ID');
  try {
    await entry.transport.handleRequest(req, res);
  } catch (err) {
    console.error(`[MCP] ${req.method} error:`, err);
    if (!res.headersSent) rpcError(res, 500, 'Internal server error', -32603);
  }
};

router.get('/', sessionRequest); // SSE stream for server -> client messages
router.delete('/', sessionRequest); // terminate session

async function closeAllSessions() {
  for (const [sid, entry] of sessions) {
    sessions.delete(sid);
    await entry.transport.close().catch(() => {});
  }
}

module.exports = { mcpRouter: router, closeAllSessions, buildServer };
