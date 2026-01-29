const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');

const getMonthString = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${year}`;
};

const getDashboardStats = async () => {
  const [
    totalRooms,
    occupiedRooms,
    availableRooms,
    maintenanceRooms,
    totalTenants,
    monthlyRevenueData,
    pendingPaymentsData
  ] = await Promise.all([
    Room.countDocuments(),
    Room.countDocuments({ status: 'occupied' }), // Assuming status values
    Room.countDocuments({ status: 'available' }),
    Room.countDocuments({ status: 'maintenance' }),
    Tenant.countDocuments(),
    // Monthly revenue (paid in current month) - simplistic view
    Payment.aggregate([
      {
        $match: {
          status: 'paid',
          // Assuming 'month' field is MM/YYYY string, or we use paidDate.
          // For simplicity let's match the string month if stored that way or do dynamic.
          // The Payment model has 'month' as string MM/YYYY.
          month: getMonthString(new Date())
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]),
    Payment.aggregate([
      {
        $match: {
          status: { $in: ['pending', 'overdue'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]),
  ]);

  const monthlyRevenue = monthlyRevenueData[0] ? monthlyRevenueData[0].total : 0;
  const pendingPayments = pendingPaymentsData[0] ? pendingPaymentsData[0].total : 0;
  const overduePayments = 0; // Logic for overdue could be specific

  return {
    totalRooms,
    occupiedRooms,
    availableRooms,
    maintenanceRooms,
    totalTenants,
    monthlyRevenue,
    pendingPayments,
    overduePayments
  };
};

const getRevenueStats = async () => {
  const now = new Date();
  const currentMonth = getMonthString(now);

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = getMonthString(lastMonthDate);

  const [thisMonthData, lastMonthData, pendingData] = await Promise.all([
    Payment.aggregate([
      { $match: { status: 'paid', month: currentMonth } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Payment.aggregate([
      { $match: { status: 'paid', month: lastMonth } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Payment.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
  ]);

  const thisMonth = thisMonthData[0] ? thisMonthData[0].total : 0;
  const lastMonthVal = lastMonthData[0] ? lastMonthData[0].total : 0;
  const pending = pendingData[0] ? pendingData[0].total : 0;

  let growth = 0;
  if (lastMonthVal > 0) {
    growth = ((thisMonth - lastMonthVal) / lastMonthVal) * 100;
  } else if (thisMonth > 0) {
    growth = 100;
  }

  return {
    thisMonth,
    growth,
    pending
  };
};

module.exports = {
  getDashboardStats,
  getRevenueStats
};
