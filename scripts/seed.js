require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../src/config/env');
const User = require('../src/models/User');
const Floor = require('../src/models/Floor');
const Room = require('../src/models/Room');
const Tenant = require('../src/models/Tenant');
const Contract = require('../src/models/Contract');
const Payment = require('../src/models/Payment');
const KnowledgeDoc = require('../src/models/KnowledgeDoc');
const VectorEmbeddings = require('../src/models/VectorEmbeddings');
const ChatHistory = require('../src/models/ChatHistory');
const serviceRag = require('../src/services/serviceRag');

async function seedDatabase() {
  const uri = process.env.MONGO_URI || env.MONGO_URI || 'mongodb://127.0.0.1:27017/fast_room_manager_dev';
  console.log(`[Seed] Connecting to MongoDB at ${uri}...`);

  try {
    await mongoose.connect(uri, { autoIndex: true });
    console.log('[Seed] Connected successfully to MongoDB.');

    // 1. Clear old data
    console.log('[Seed] Clearing old collections...');
    await Promise.all([
      User.deleteMany({}),
      Floor.deleteMany({}),
      Room.deleteMany({}),
      Tenant.deleteMany({}),
      Contract.deleteMany({}),
      Payment.deleteMany({}),
      KnowledgeDoc.deleteMany({}),
      VectorEmbeddings.deleteMany({}),
      ChatHistory.deleteMany({}),
    ]);
    console.log('[Seed] Cleared collections.');

    // 2. Seed Users
    console.log('[Seed] Creating demo users...');
    const adminUser = await User.create({
      name: 'Admin Quản Lý',
      email: 'admin@example.com',
      password: 'adminPassword123',
      role: 'admin',
    });

    const demoUser = await User.create({
      name: 'Khách Thuê Demo',
      email: 'tenant@example.com',
      password: 'tenantPassword123',
      role: 'user',
    });
    console.log(`[Seed] Created 2 users (Admin: ${adminUser.email}, User: ${demoUser.email})`);

    // 3. Seed Floors
    console.log('[Seed] Creating floors...');
    const floor1 = await Floor.create({ name: 'Tầng 1' });
    const floor2 = await Floor.create({ name: 'Tầng 2' });
    const floor3 = await Floor.create({ name: 'Tầng 3' });
    const floor4 = await Floor.create({ name: 'Tầng 4' });
    console.log('[Seed] Created 4 floors.');

    // 4. Seed Rooms
    console.log('[Seed] Creating sample rooms...');
    const roomsData = [
      {
        name: 'Phòng 101',
        idFloor: floor1._id,
        type: 'single',
        area: 20,
        price: 2800000,
        deposit: 2800000,
        status: 'available',
        amenities: ['Điều hòa', 'Bình nóng lạnh', 'Wifi miễn phí', 'Chỗ để xe tầng 1'],
        description: 'Phòng đơn tầng trệt đi lại thuận tiện, không cần leo cầu thang, có cửa sổ lấy gió thoáng mát.',
        images: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af'],
      },
      {
        name: 'Phòng 102',
        idFloor: floor1._id,
        type: 'single',
        area: 22,
        price: 3000000,
        deposit: 3000000,
        status: 'occupied',
        amenities: ['Điều hòa', 'Bình nóng lạnh', 'Tủ quần áo', 'Wifi miễn phí'],
        description: 'Phòng đơn tầng 1, nội thất cơ bản đầy đủ, yên tĩnh.',
        images: ['https://images.unsplash.com/photo-1598928506311-c55ded91a20c'],
      },
      {
        name: 'Phòng 201',
        idFloor: floor2._id,
        type: 'single',
        area: 25,
        price: 3500000,
        deposit: 3500000,
        status: 'available',
        amenities: ['Điều hòa', 'Bình nóng lạnh', 'Ban công', 'Gác lửng', 'Tủ lạnh', 'Wifi miễn phí'],
        description: 'Phòng đơn Tầng 2 rộng rãi có ban công ngắm cảnh hướng Đông, gác lửng cao ráo đứng không chạm đầu, ngập tràn ánh sáng.',
        images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'],
      },
      {
        name: 'Phòng 202',
        idFloor: floor2._id,
        type: 'double',
        area: 30,
        price: 4200000,
        deposit: 4200000,
        status: 'occupied',
        amenities: ['Điều hòa', 'Máy giặt riêng', 'Tủ lạnh', 'Giường nệm cao cấp', 'Bếp nấu ăn riêng'],
        description: 'Phòng đôi Tầng 2 thích hợp cho 2 người ở, có máy giặt riêng trong phòng vệ sinh và khu bếp khép kín.',
        images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2'],
      },
      {
        name: 'Phòng 203',
        idFloor: floor2._id,
        type: 'single',
        area: 24,
        price: 3600000,
        deposit: 3600000,
        status: 'maintenance',
        amenities: ['Điều hòa', 'Bình nóng lạnh', 'Gác lửng'],
        description: 'Phòng đang được sơn mới và kiểm tra lại hệ thống điều hòa, dự kiến hoàn thành sau 3 ngày.',
        images: ['https://images.unsplash.com/photo-1536376072261-38c75010e6c9'],
      },
      {
        name: 'Phòng 301',
        idFloor: floor3._id,
        type: 'double',
        area: 32,
        price: 4500000,
        deposit: 4500000,
        status: 'available',
        amenities: ['Điều hòa Inverter', 'Tủ lạnh 2 cánh', 'Bàn làm việc', 'Tủ quần áo gỗ', 'Ban công view thoáng', 'Khoá cửa vân tay riêng'],
        description: 'Phòng đôi Tầng 3 thiết kế hiện đại phong cách studio, ban công cây xanh thoáng mát, đón gió trời tự nhiên.',
        images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750'],
      },
      {
        name: 'Phòng 302',
        idFloor: floor3._id,
        type: 'family',
        area: 45,
        price: 6000000,
        deposit: 6000000,
        status: 'occupied',
        amenities: ['2 Điều hòa', 'Smart TV 43 inch', 'Sofa phòng khách', 'Tủ bếp trên dưới', 'Máy hút mùi', 'Tủ lạnh lớn', 'Máy giặt riêng'],
        description: 'Căn hộ mini gia đình gồm 1 phòng khách + 1 phòng ngủ riêng biệt, đầy đủ tiện nghi cao cấp cho hộ gia đình trẻ.',
        images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb'],
      },
      {
        name: 'Phòng 401',
        idFloor: floor4._id,
        type: 'single',
        area: 26,
        price: 3200000,
        deposit: 3200000,
        status: 'available',
        amenities: ['Điều hòa', 'Bình nóng lạnh', 'Sân phơi liền kề', 'Wifi tốc độ cao'],
        description: 'Phòng tầng 4 cạnh sân thượng mát mẻ, cực kỳ yên tĩnh, thích hợp cho người thích không gian riêng tư làm việc online.',
        images: ['https://images.unsplash.com/photo-1554995207-c18c203602cb'],
      },
    ];

    const createdRooms = await Room.insertMany(roomsData);
    console.log(`[Seed] Created ${createdRooms.length} rooms.`);

    // 5. Seed Tenants
    console.log('[Seed] Creating sample tenants...');
    const tenant1 = await Tenant.create({
      name: 'Nguyễn Văn An',
      phone: '0912345678',
      email: 'nguyenvanan@gmail.com',
      idCard: '079199001234',
      address: 'Phường 12, Quận Bình Thạnh, TP. Hồ Chí Minh',
      emergencyContact: 'Nguyễn Văn Ba (Bố)',
      emergencyContactPhone: '0909111222',
      notes: 'Khách thuê lịch sự, thanh toán đúng hạn',
      status: 'active',
    });

    const tenant2 = await Tenant.create({
      name: 'Trần Thị Bích',
      phone: '0987654321',
      email: 'tranbich@gmail.com',
      idCard: '079198005678',
      address: 'Phường Tân Định, Quận 1, TP. Hồ Chí Minh',
      emergencyContact: 'Trần Văn Cường (Anh trai)',
      emergencyContactPhone: '0908333444',
      notes: 'Nuôi 1 mèo nhỏ đã đăng ký',
      status: 'active',
    });

    const tenant3 = await Tenant.create({
      name: 'Lê Hoàng Nam',
      phone: '0903123456',
      email: 'lehoangnam@gmail.com',
      idCard: '079197009876',
      address: 'Phường 5, Quận Gò Vấp, TP. Hồ Chí Minh',
      emergencyContact: 'Lê Hoàng Hải (Bố)',
      emergencyContactPhone: '0918555666',
      notes: 'Hộ gia đình 2 vợ chồng + 1 con nhỏ',
      status: 'active',
    });
    console.log('[Seed] Created 3 tenants.');

    // 6. Seed Contracts
    console.log('[Seed] Creating active contracts...');
    const room102 = createdRooms.find((r) => r.name === 'Phòng 102');
    const room202 = createdRooms.find((r) => r.name === 'Phòng 202');
    const room302 = createdRooms.find((r) => r.name === 'Phòng 302');

    const contract1 = await Contract.create({
      roomId: room102._id.toString(),
      tenantId: tenant1._id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      monthlyRent: room102.price,
      deposit: room102.deposit,
      status: 'active',
    });

    const contract2 = await Contract.create({
      roomId: room202._id.toString(),
      tenantId: tenant2._id,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2027-01-31'),
      monthlyRent: room202.price,
      deposit: room202.deposit,
      status: 'active',
    });

    const contract3 = await Contract.create({
      roomId: room302._id.toString(),
      tenantId: tenant3._id,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2027-01-14'),
      monthlyRent: room302.price,
      deposit: room302.deposit,
      status: 'active',
    });
    console.log('[Seed] Created 3 active contracts.');

    // 7. Seed Payments (Bills)
    console.log('[Seed] Creating payment bills...');
    await Payment.create([
      {
        contractId: contract1._id,
        month: '01/2026',
        rentAmount: 3000000,
        electricityAmount: 280000,
        waterAmount: 100000,
        totalAmount: 3380000,
        paidAmount: 3380000,
        paidDate: new Date('2026-01-04'),
        status: 'paid',
      },
      {
        contractId: contract1._id,
        month: '02/2026',
        rentAmount: 3000000,
        electricityAmount: 315000,
        waterAmount: 100000,
        totalAmount: 3415000,
        paidAmount: 0,
        status: 'pending',
      },
      {
        contractId: contract2._id,
        month: '02/2026',
        rentAmount: 4200000,
        electricityAmount: 420000,
        waterAmount: 200000,
        totalAmount: 4820000,
        paidAmount: 4820000,
        paidDate: new Date('2026-02-03'),
        status: 'paid',
      },
      {
        contractId: contract3._id,
        month: '02/2026',
        rentAmount: 6000000,
        electricityAmount: 650000,
        waterAmount: 300000,
        totalAmount: 6950000,
        paidAmount: 0,
        status: 'pending',
      },
    ]);
    console.log('[Seed] Created sample payments.');

    // 8. Trigger RAG Sync to Index Knowledge Docs & All Rooms to Vector Store
    console.log('[Seed] Synchronizing RAG knowledge base & vector store...');
    const ragSyncResult = await serviceRag.syncAll();
    console.log(`[Seed] RAG Sync complete: ${ragSyncResult.roomsSynced} rooms synced, ${ragSyncResult.docsSynced} docs synced, ${ragSyncResult.totalVectors} total vectors generated.`);

    console.log('\n======================================================');
    console.log('  DATABASE SEEDING COMPLETED SUCCESSFULLY!  ');
    console.log('======================================================\n');
    console.log('Sample Accounts:');
    console.log('- Admin: admin@example.com / adminPassword123');
    console.log('- User:  tenant@example.com / tenantPassword123\n');
    console.log(`Rooms Created: ${createdRooms.length} (Available: 4, Occupied: 3, Maintenance: 1)`);
    console.log(`Knowledge Docs: 3 indexed (noi-quy, chinh-sach-dat-coc, bieu-phi-dich-vu)`);
    console.log(`Vector Embeddings: ${ragSyncResult.totalVectors} chunks`);
    console.log('======================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    if (mongoose.connection) await mongoose.connection.close();
    process.exit(1);
  }
}

seedDatabase();
