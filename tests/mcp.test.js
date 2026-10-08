/* eslint-disable no-console */
// End-to-end test for the MCP endpoint (/mcp). Uses a SEPARATE database (<db>_mcp_test) that is dropped afterwards.
// Run: npm run test:mcp
require('dotenv').config();

const baseUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fast_room_manager_dev';
process.env.MONGO_URI = baseUri.replace(/\/([^/?]+)(\?|$)/, (_, db, q) => `/${db}_mcp_test${q}`);
process.env.MCP_API_KEY = 'test-static-key-123';

const assert = require('assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

const env = require('../src/config/env');
const app = require('../src/app');
const { connectDB } = require('../src/config/db');
const { closeAllSessions } = require('../src/mcp');
const Floor = require('../src/models/Floor');
const Room = require('../src/models/Room');
const Tenant = require('../src/models/Tenant');
const Contract = require('../src/models/Contract');
const Payment = require('../src/models/Payment');
const KnowledgeDoc = require('../src/models/KnowledgeDoc');
const User = require('../src/models/User');

const results = [];
let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    results.push(`  PASS ${name}`);
  } catch (err) {
    failed++;
    results.push(`  FAIL ${name}\n       -> ${err.message}`);
  }
}

const sign = (sub) => jwt.sign({ sub, exp: Math.floor(Date.now() / 1000) + 600 }, env.JWT_SECRET);
const H = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
const INIT = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'raw', version: '1' } },
};

async function connect(base, token) {
  const client = new Client({ name: 'mcp-test', version: '1' });
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  return { client, transport };
}

async function seed() {
  const [f1, f2] = await Floor.create([{ name: 'Tầng 1' }, { name: 'Tầng 2' }]);
  const rooms = await Room.create([
    { name: 'P101', idFloor: f1._id, type: 'single', price: 2500000, deposit: 2500000, status: 'occupied', area: 20 },
    { name: 'P102', idFloor: f1._id, type: 'double', price: 3500000, deposit: 3500000, status: 'available', area: 28 },
    { name: 'P201', idFloor: f2._id, type: 'family', price: 5000000, deposit: 5000000, status: 'maintenance', area: 40 },
  ]);
  const tenant = await Tenant.create({
    name: 'Nguyễn Văn A',
    phone: '0901234567',
    email: 'vana@example.com',
    idCard: '079123456789',
    cardImages: ['secret-front.jpg', 'secret-back.jpg'],
    address: '12 Lê Lợi, Quận 1, TP.HCM',
    status: 'active',
  });
  const now = new Date();
  const contract = await Contract.create({
    roomId: rooms[0]._id.toString(),
    tenantId: tenant._id,
    startDate: new Date(now.getTime() - 300 * 86400000),
    endDate: new Date(now.getTime() + 20 * 86400000),
    monthlyRent: 2500000,
    deposit: 2500000,
    status: 'active',
  });
  const mm = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const thisMonth = mm(now);
  await Payment.create([
    { contractId: contract._id, month: thisMonth, rentAmount: 2500000, electricityAmount: 300000, waterAmount: 100000, totalAmount: 2900000, paidAmount: 2900000, status: 'paid', paidDate: now },
    { contractId: contract._id, month: '01/2020', rentAmount: 2500000, totalAmount: 2500000, paidAmount: 1000000, status: 'overdue' },
  ]);
  await KnowledgeDoc.create({ title: 'Nội quy phòng trọ', fileName: 'noi-quy.md', content: '# Nội quy\nGiữ yên lặng sau 22h.', status: 'indexed' });
  const user = await User.create({ name: 'Admin', email: 'admin@example.com', password: 'secret123' });
  const other = await User.create({ name: 'Other', email: 'other@example.com', password: 'secret123' });
  return { rooms, tenant, contract, thisMonth, user, other };
}

async function counts() {
  const ms = [Floor, Room, Tenant, Contract, Payment, KnowledgeDoc, User];
  return Promise.all(ms.map((m) => m.countDocuments()));
}

async function main() {
  const connected = await connectDB();
  assert(connected, 'MongoDB not reachable');
  await mongoose.connection.dropDatabase();
  await Promise.all([Floor, Room, Tenant, KnowledgeDoc, User].map((m) => m.syncIndexes()));
  const data = await seed();
  const before = await counts();

  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = sign(data.user.id);

  await test('401 without Authorization', async () => {
    const r = await fetch(`${base}/mcp`, { method: 'POST', headers: H, body: JSON.stringify(INIT) });
    assert.strictEqual(r.status, 401);
    assert.strictEqual((await r.json()).error.code, -32001);
  });

  await test('401 with invalid / expired JWT', async () => {
    const expired = jwt.sign({ sub: data.user.id, exp: Math.floor(Date.now() / 1000) - 10 }, env.JWT_SECRET);
    for (const t of ['garbage', expired]) {
      const r = await fetch(`${base}/mcp`, { method: 'POST', headers: { ...H, Authorization: `Bearer ${t}` }, body: JSON.stringify(INIT) });
      assert.strictEqual(r.status, 401);
    }
  });

  let rawSid;
  await test('raw initialize -> 200 + Mcp-Session-Id; non-initialize w/o session -> 400', async () => {
    const r = await fetch(`${base}/mcp`, { method: 'POST', headers: { ...H, Authorization: `Bearer ${token}` }, body: JSON.stringify(INIT) });
    assert.strictEqual(r.status, 200);
    rawSid = r.headers.get('mcp-session-id');
    assert(rawSid, 'missing Mcp-Session-Id');
    assert.strictEqual(r.headers.get('access-control-expose-headers').includes('Mcp-Session-Id'), true);
    const bad = await fetch(`${base}/mcp`, { method: 'POST', headers: { ...H, Authorization: `Bearer ${token}` }, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) });
    assert.strictEqual(bad.status, 400);
  });

  await test('session cannot be used by another user -> 403', async () => {
    const r = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { ...H, Authorization: `Bearer ${sign(data.other.id)}`, 'Mcp-Session-Id': rawSid },
      body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list' }),
    });
    assert.strictEqual(r.status, 403);
  });

  await test('DELETE session, then reuse -> 404', async () => {
    const d = await fetch(`${base}/mcp`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Mcp-Session-Id': rawSid } });
    assert.strictEqual(d.status, 200);
    const r = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { ...H, Authorization: `Bearer ${token}`, 'Mcp-Session-Id': rawSid },
      body: JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/list' }),
    });
    assert.strictEqual(r.status, 404);
  });

  const { client } = await connect(base, token);
  const call = async (name, args = {}) => client.callTool({ name, arguments: args });

  const EXPECTED_TOOLS = [
    'list_floors', 'list_rooms', 'get_room', 'list_tenants', 'get_tenant', 'list_contracts', 'get_contract',
    'list_payments', 'get_payment', 'get_dashboard_stats', 'get_revenue_stats', 'list_knowledge_docs', 'search_knowledge',
  ];
  await test('SDK client: tools/list has all 13 read-only tools', async () => {
    const { tools } = await client.listTools();
    assert.deepStrictEqual(tools.map((t) => t.name).sort(), [...EXPECTED_TOOLS].sort());
    assert(tools.every((t) => t.annotations && t.annotations.readOnlyHint === true), 'all tools must be readOnly');
  });

  await test('list_floors with room counts', async () => {
    const r = (await call('list_floors')).structuredContent;
    assert.strictEqual(r.total, 2);
    const t1 = r.floors.find((f) => f.name === 'Tầng 1');
    assert.deepStrictEqual([t1.rooms.total, t1.rooms.occupied, t1.rooms.available], [2, 1, 1]);
  });

  await test('list_rooms filters + pagination + populated floor', async () => {
    let r = (await call('list_rooms', { status: 'available' })).structuredContent;
    assert.deepStrictEqual(r.rooms.map((x) => x.name), ['P102']);
    assert.strictEqual(r.rooms[0].idFloor.name, 'Tầng 1');
    r = (await call('list_rooms', { maxPrice: 3500000, sortBy: 'price', order: 'desc' })).structuredContent;
    assert.deepStrictEqual(r.rooms.map((x) => x.name), ['P102', 'P101']);
    r = (await call('list_rooms', { limit: 1, page: 2 })).structuredContent;
    assert.deepStrictEqual([r.totalItems, r.totalPages, r.rooms.length, r.rooms[0].name], [3, 3, 1, 'P102']);
  });

  await test('list_rooms search with regex special chars does not crash', async () => {
    const r = await call('list_rooms', { search: '(P1[' });
    assert(!r.isError, JSON.stringify(r.content));
    assert.strictEqual(r.structuredContent.totalItems, 0);
  });

  await test('get_room: active contract, tenant idCard masked, no cardImages', async () => {
    const r = (await call('get_room', { id: data.rooms[0].id })).structuredContent;
    assert.strictEqual(r.room.name, 'P101');
    assert.strictEqual(r.activeContract.tenantId.idCard, '********6789');
    assert.strictEqual(r.activeContract.tenantId.cardImages, undefined);
    assert.strictEqual(r.recentPayments.length, 2);
    assert(!JSON.stringify(r).includes('079123456789') && !JSON.stringify(r).includes('secret-front'), 'PII leaked');
  });

  await test('get_room not found -> isError NOT_FOUND; bad id -> error', async () => {
    const r = await call('get_room', { id: '0123456789abcdef01234567' });
    assert.strictEqual(r.isError, true);
    assert(r.content[0].text.startsWith('NOT_FOUND'));
    let bad;
    try {
      bad = await call('get_room', { id: 'nope' });
    } catch (e) {
      bad = { isError: true, content: [{ text: e.message }] };
    }
    assert.strictEqual(bad.isError, true);
  });

  await test('list_tenants / get_tenant mask PII', async () => {
    const l = (await call('list_tenants', { search: '0901' })).structuredContent;
    assert.strictEqual(l.totalItems, 1);
    assert.strictEqual(l.tenants[0].idCard, '********6789');
    const g = (await call('get_tenant', { id: data.tenant.id })).structuredContent;
    assert.strictEqual(g.contracts[0].roomId.name, 'P101');
    assert(!JSON.stringify(g).includes('079123456789'));
  });

  await test('list_contracts expiringWithinDays', async () => {
    assert.strictEqual((await call('list_contracts', { expiringWithinDays: 30 })).structuredContent.totalItems, 1);
    assert.strictEqual((await call('list_contracts', { expiringWithinDays: 10 })).structuredContent.totalItems, 0);
  });

  await test('get_contract with payments + outstanding', async () => {
    const r = (await call('get_contract', { id: data.contract.id })).structuredContent;
    assert.strictEqual(r.payments.length, 2);
    assert.strictEqual(r.outstanding, 1500000);
    assert.strictEqual(r.contract.roomId.name, 'P101');
  });

  await test('list_payments month filter + totals; invalid month rejected', async () => {
    const r = (await call('list_payments', { month: data.thisMonth })).structuredContent;
    assert.deepStrictEqual([r.totalItems, r.totals.totalAmount], [1, 2900000]);
    assert.strictEqual(r.payments[0].contractId.roomId.name, 'P101');
    const o = (await call('list_payments', { status: 'overdue' })).structuredContent;
    assert.strictEqual(o.totalItems, 1);
    const g = (await call('get_payment', { id: o.payments[0]._id })).structuredContent;
    assert.strictEqual(g.payment.contractId.tenantId.name, 'Nguyễn Văn A');
    let bad;
    try {
      bad = await call('list_payments', { month: '2025-01' });
    } catch (e) {
      bad = { isError: true };
    }
    assert.strictEqual(bad.isError, true);
  });

  await test('get_dashboard_stats / get_revenue_stats', async () => {
    const d = (await call('get_dashboard_stats')).structuredContent;
    assert.deepStrictEqual(
      [d.totalRooms, d.occupiedRooms, d.availableRooms, d.maintenanceRooms, d.totalTenants, d.monthlyRevenue, d.pendingPayments],
      [3, 1, 1, 1, 1, 2900000, 2500000]
    );
    const rv = (await call('get_revenue_stats')).structuredContent;
    assert.strictEqual(rv.thisMonth, 2900000);
  });

  await test('list_knowledge_docs / search_knowledge (mock embedding when no API key)', async () => {
    const k = (await call('list_knowledge_docs')).structuredContent;
    assert.strictEqual(k.documents[0].title, 'Nội quy phòng trọ');
    assert.strictEqual(k.documents[0].content, undefined);
    const s = await call('search_knowledge', { query: 'giờ giữ yên lặng', topK: 3 });
    assert(!s.isError, JSON.stringify(s.content));
    assert(Array.isArray(s.structuredContent.results));
  });

  await test('MCP_API_KEY static token works', async () => {
    const { client: c2 } = await connect(base, process.env.MCP_API_KEY);
    const r = (await c2.callTool({ name: 'list_floors', arguments: {} })).structuredContent;
    assert.strictEqual(r.total, 2);
    await c2.close();
  });

  await test('REST API still works and /mcp did not break 404 handling', async () => {
    assert.strictEqual((await fetch(`${base}/health`)).status, 200);
    assert.strictEqual((await fetch(`${base}/api/v1/rooms?page=1&limit=10`)).status < 500, true);
    assert.strictEqual((await fetch(`${base}/nope`)).status, 404);
  });

  await test('read-only: no documents created/changed', async () => {
    assert.deepStrictEqual(await counts(), before);
  });

  await client.close();
  await closeAllSessions();
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  console.log(results.join('\n'));
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
