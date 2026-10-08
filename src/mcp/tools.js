// Read-only MCP tools for Fast Room Manager.
// Reuses existing services where possible; otherwise runs read-only Mongoose queries.
const { z } = require('zod');

const Floor = require('../models/Floor');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const KnowledgeDoc = require('../models/KnowledgeDoc');
const serviceRooms = require('../services/serviceRooms');
const serviceReports = require('../services/serviceReports');
const serviceRag = require('../services/serviceRag');

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Must be a 24-char hex ObjectId');
const page = z.number().int().min(1).optional().describe('Page number, default 1');
const limit = z.number().int().min(1).max(100).optional().describe('Page size, default 20, max 100');
const monthStr = z.string().regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Format MM/YYYY');

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

/** Convert ObjectIds/Dates to plain JSON. */
const plain = (v) => JSON.parse(JSON.stringify(v));

const ok = (data) => {
  const d = plain(data);
  return { content: [{ type: 'text', text: JSON.stringify(d, null, 2) }], structuredContent: d };
};
const fail = (code, message) => ({
  isError: true,
  content: [{ type: 'text', text: `${code}: ${message}` }],
  structuredContent: { error: code, message },
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Hide sensitive tenant data before it reaches an LLM. */
const TENANT_PROJECTION = '-cardImages -__v';
const maskTenant = (t) => {
  if (!t || typeof t !== 'object') return t;
  const out = { ...t };
  if (typeof out.idCard === 'string' && out.idCard.length > 4) {
    out.idCard = `${'*'.repeat(out.idCard.length - 4)}${out.idCard.slice(-4)}`;
  }
  delete out.cardImages;
  return out;
};

const paging = (args) => {
  const p = args.page || 1;
  const l = args.limit || 20;
  return { page: p, limit: l, skip: (p - 1) * l };
};

/** Wrap a handler so DB/service errors become MCP tool errors instead of protocol errors. */
const safe = (fn) => async (args, extra) => {
  try {
    return await fn(args || {}, extra);
  } catch (err) {
    console.error('[MCP] tool error:', err);
    return fail('INTERNAL_ERROR', err.message || 'Unexpected error');
  }
};

function registerTools(server) {
  // ---------------------------------------------------------------- Floors
  server.registerTool(
    'list_floors',
    {
      title: 'List floors',
      description: 'List all floors with the number of rooms on each floor (by status).',
      inputSchema: {},
      annotations: READ_ONLY,
    },
    safe(async () => {
      const [floors, counts] = await Promise.all([
        Floor.find().sort({ name: 1 }).lean(),
        Room.aggregate([{ $group: { _id: { floor: '$idFloor', status: '$status' }, n: { $sum: 1 } } }]),
      ]);
      const byFloor = {};
      for (const c of counts) {
        const k = String(c._id.floor);
        byFloor[k] = byFloor[k] || { total: 0 };
        byFloor[k][c._id.status] = c.n;
        byFloor[k].total += c.n;
      }
      const items = floors.map((f) => ({ _id: f._id, name: f.name, rooms: byFloor[String(f._id)] || { total: 0 } }));
      return ok({ total: items.length, floors: items });
    })
  );

  // ---------------------------------------------------------------- Rooms
  server.registerTool(
    'list_rooms',
    {
      title: 'List rooms',
      description: 'Search rooms with filters and pagination. Prices are in VND per month.',
      inputSchema: {
        search: z.string().optional().describe('Matches room name or description (case-insensitive)'),
        status: z.enum(['available', 'occupied', 'maintenance']).optional(),
        type: z.enum(['single', 'double', 'family']).optional(),
        floorId: objectId.optional().describe('Filter by floor _id'),
        minPrice: z.number().min(0).optional(),
        maxPrice: z.number().min(0).optional(),
        sortBy: z.enum(['name', 'price', 'area', 'createdAt']).optional().describe('Default name'),
        order: z.enum(['asc', 'desc']).optional(),
        page,
        limit,
      },
      annotations: READ_ONLY,
    },
    safe(async (args) => {
      const { page: p, limit: l, skip } = paging(args);
      const q = {};
      if (args.search) q.$or = [{ name: new RegExp(escapeRegex(args.search), 'i') }, { description: new RegExp(escapeRegex(args.search), 'i') }];
      if (args.status) q.status = args.status;
      if (args.type) q.type = args.type;
      if (args.floorId) q.idFloor = args.floorId;
      if (args.minPrice != null || args.maxPrice != null) {
        q.price = {};
        if (args.minPrice != null) q.price.$gte = args.minPrice;
        if (args.maxPrice != null) q.price.$lte = args.maxPrice;
      }
      const sort = { [args.sortBy || 'name']: args.order === 'desc' ? -1 : 1 };
      const [totalItems, rooms] = await Promise.all([
        Room.countDocuments(q),
        Room.find(q).populate('idFloor', 'name').select('-__v -images').sort(sort).skip(skip).limit(l).lean(),
      ]);
      return ok({ page: p, limit: l, totalItems, totalPages: Math.ceil(totalItems / l), rooms });
    })
  );

  server.registerTool(
    'get_room',
    {
      title: 'Get room detail',
      description: 'Get one room with its floor, current active contract (with tenant) and the latest payments.',
      inputSchema: { id: objectId.describe('Room _id') },
      annotations: READ_ONLY,
    },
    safe(async ({ id }) => {
      const room = await serviceRooms.getRoomById(id);
      if (!room) return fail('NOT_FOUND', `Room ${id} not found`);
      const contracts = await Contract.find({ roomId: id }).populate('tenantId', TENANT_PROJECTION).sort({ startDate: -1 }).lean();
      const active = contracts.find((c) => c.status === 'active') || null;
      const recentPayments = active
        ? await Payment.find({ contractId: active._id }).sort({ createdAt: -1 }).limit(6).lean()
        : [];
      if (active) active.tenantId = maskTenant(active.tenantId);
      return ok({ room, activeContract: active, contractHistoryCount: contracts.length, recentPayments });
    })
  );

  // ---------------------------------------------------------------- Tenants
  server.registerTool(
    'list_tenants',
    {
      title: 'List tenants',
      description: 'Search tenants. ID card numbers are masked and card images are omitted.',
      inputSchema: {
        search: z.string().optional().describe('Matches name, phone or email'),
        status: z.enum(['active', 'inactive', 'terminated']).optional(),
        page,
        limit,
      },
      annotations: READ_ONLY,
    },
    safe(async (args) => {
      const { page: p, limit: l, skip } = paging(args);
      const q = {};
      if (args.search) {
        const rx = new RegExp(escapeRegex(args.search), 'i');
        q.$or = [{ name: rx }, { phone: rx }, { email: rx }];
      }
      if (args.status) q.status = args.status;
      const [totalItems, tenants] = await Promise.all([
        Tenant.countDocuments(q),
        Tenant.find(q).select(TENANT_PROJECTION).sort({ name: 1 }).skip(skip).limit(l).lean(),
      ]);
      return ok({ page: p, limit: l, totalItems, totalPages: Math.ceil(totalItems / l), tenants: tenants.map(maskTenant) });
    })
  );

  server.registerTool(
    'get_tenant',
    {
      title: 'Get tenant detail',
      description: 'Get one tenant with their contracts (and rooms).',
      inputSchema: { id: objectId.describe('Tenant _id') },
      annotations: READ_ONLY,
    },
    safe(async ({ id }) => {
      const tenant = await Tenant.findById(id).select(TENANT_PROJECTION).lean();
      if (!tenant) return fail('NOT_FOUND', `Tenant ${id} not found`);
      const contracts = await Contract.find({ tenantId: id }).populate('roomId', 'name price status idFloor').sort({ startDate: -1 }).lean();
      return ok({ tenant: maskTenant(tenant), contracts });
    })
  );

  // ---------------------------------------------------------------- Contracts
  server.registerTool(
    'list_contracts',
    {
      title: 'List contracts',
      description: 'List rental contracts. Use expiringWithinDays to find active contracts ending soon.',
      inputSchema: {
        status: z.enum(['active', 'expired', 'terminated']).optional(),
        roomId: objectId.optional(),
        tenantId: objectId.optional(),
        expiringWithinDays: z.number().int().min(0).max(3650).optional().describe('Active contracts whose endDate is within N days from now'),
        page,
        limit,
      },
      annotations: READ_ONLY,
    },
    safe(async (args) => {
      const { page: p, limit: l, skip } = paging(args);
      const q = {};
      if (args.status) q.status = args.status;
      if (args.roomId) q.roomId = args.roomId;
      if (args.tenantId) q.tenantId = args.tenantId;
      if (args.expiringWithinDays != null) {
        const now = new Date();
        q.status = 'active';
        q.endDate = { $gte: now, $lte: new Date(now.getTime() + args.expiringWithinDays * 86400000) };
      }
      const [totalItems, contracts] = await Promise.all([
        Contract.countDocuments(q),
        Contract.find(q)
          .populate('roomId', 'name price status')
          .populate('tenantId', 'name phone email status')
          .sort(args.expiringWithinDays != null ? { endDate: 1 } : { startDate: -1 })
          .skip(skip)
          .limit(l)
          .lean(),
      ]);
      return ok({ page: p, limit: l, totalItems, totalPages: Math.ceil(totalItems / l), contracts });
    })
  );

  server.registerTool(
    'get_contract',
    {
      title: 'Get contract detail',
      description: 'Get one contract with room, tenant and all its payments.',
      inputSchema: { id: objectId.describe('Contract _id') },
      annotations: READ_ONLY,
    },
    safe(async ({ id }) => {
      const contract = await Contract.findById(id).populate('roomId', '-__v -images').populate('tenantId', TENANT_PROJECTION).lean();
      if (!contract) return fail('NOT_FOUND', `Contract ${id} not found`);
      contract.tenantId = maskTenant(contract.tenantId);
      const payments = await Payment.find({ contractId: id }).sort({ createdAt: -1 }).lean();
      const outstanding = payments
        .filter((x) => x.status !== 'paid')
        .reduce((s, x) => s + Math.max(0, (x.totalAmount || 0) - (x.paidAmount || 0)), 0);
      return ok({ contract, payments, outstanding });
    })
  );

  // ---------------------------------------------------------------- Payments
  server.registerTool(
    'list_payments',
    {
      title: 'List payments',
      description: 'List monthly payments (rent + electricity + water). Amounts in VND.',
      inputSchema: {
        status: z.enum(['pending', 'paid', 'overdue']).optional(),
        month: monthStr.optional().describe('Billing month, MM/YYYY'),
        contractId: objectId.optional(),
        page,
        limit,
      },
      annotations: READ_ONLY,
    },
    safe(async (args) => {
      const { page: p, limit: l, skip } = paging(args);
      const q = {};
      if (args.status) q.status = args.status;
      if (args.month) q.month = args.month;
      if (args.contractId) q.contractId = args.contractId;
      const [totalItems, payments, sum] = await Promise.all([
        Payment.countDocuments(q),
        Payment.find(q)
          .populate({ path: 'contractId', select: 'roomId tenantId status', populate: [{ path: 'roomId', select: 'name' }, { path: 'tenantId', select: 'name phone' }] })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(l)
          .lean(),
        Payment.aggregate([{ $match: q }, { $group: { _id: null, total: { $sum: '$totalAmount' }, paid: { $sum: '$paidAmount' } } }]),
      ]);
      const totals = sum[0] ? { totalAmount: sum[0].total, paidAmount: sum[0].paid } : { totalAmount: 0, paidAmount: 0 };
      return ok({ page: p, limit: l, totalItems, totalPages: Math.ceil(totalItems / l), totals, payments });
    })
  );

  server.registerTool(
    'get_payment',
    {
      title: 'Get payment detail',
      description: 'Get one payment with its contract.',
      inputSchema: { id: objectId.describe('Payment _id') },
      annotations: READ_ONLY,
    },
    safe(async ({ id }) => {
      const payment = await Payment.findById(id)
        .populate({ path: 'contractId', populate: [{ path: 'roomId', select: 'name price' }, { path: 'tenantId', select: 'name phone email' }] })
        .lean();
      if (!payment) return fail('NOT_FOUND', `Payment ${id} not found`);
      return ok({ payment });
    })
  );

  // ---------------------------------------------------------------- Reports
  server.registerTool(
    'get_dashboard_stats',
    {
      title: 'Dashboard statistics',
      description: 'Room occupancy, tenant count, revenue this month and pending payments (same as GET /api/v1/reports/dashboard).',
      inputSchema: {},
      annotations: READ_ONLY,
    },
    safe(async () => ok(await serviceReports.getDashboardStats()))
  );

  server.registerTool(
    'get_revenue_stats',
    {
      title: 'Revenue statistics',
      description: 'Paid revenue this month, growth vs last month (%), and pending amount (same as GET /api/v1/reports/revenue).',
      inputSchema: {},
      annotations: READ_ONLY,
    },
    safe(async () => ok(await serviceReports.getRevenueStats()))
  );

  // ---------------------------------------------------------------- Knowledge / RAG
  server.registerTool(
    'list_knowledge_docs',
    {
      title: 'List knowledge documents',
      description: 'List documents in the RAG knowledge base (house rules, fees, deposit policy...). Content not included.',
      inputSchema: { status: z.enum(['indexed', 'failed', 'processing']).optional() },
      annotations: READ_ONLY,
    },
    safe(async ({ status }) => {
      const docs = await KnowledgeDoc.find(status ? { status } : {})
        .select('title fileName fileType source status chunkCount updatedAt')
        .sort({ title: 1 })
        .lean();
      return ok({ total: docs.length, documents: docs });
    })
  );

  server.registerTool(
    'search_knowledge',
    {
      title: 'Semantic search (RAG)',
      description:
        'Semantic + keyword search over indexed knowledge documents and room data. Returns the most relevant text chunks with scores. Requires an embedding provider key and a prior /api/v1/rag/sync.',
      inputSchema: {
        query: z.string().min(1).describe('Natural-language question, e.g. "tiền cọc được hoàn khi nào"'),
        sourceType: z.enum(['document', 'room']).optional().describe('Restrict to documents or rooms'),
        roomStatus: z.enum(['available', 'occupied', 'maintenance']).optional(),
        roomType: z.enum(['single', 'double', 'family']).optional(),
        minPrice: z.number().min(0).optional(),
        maxPrice: z.number().min(0).optional(),
        topK: z.number().int().min(1).max(20).optional().describe('Default from VECTOR_TOP_K'),
      },
      annotations: { ...READ_ONLY, openWorldHint: true }, // calls the embedding provider
    },
    safe(async (args) => {
      const results = await serviceRag.retrieveRelevantContext(args.query, {
        topK: args.topK,
        filter: {
          sourceType: args.sourceType,
          status: args.roomStatus,
          roomType: args.roomType,
          minPrice: args.minPrice,
          maxPrice: args.maxPrice,
        },
      });
      return ok({ query: args.query, total: results.length, results });
    })
  );
}

module.exports = { registerTools, maskTenant };
