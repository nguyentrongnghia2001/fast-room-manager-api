const catchAsync = require('../utils/catchAsync');
const reportsService = require('../services/serviceReports');

const getDashboardStats = catchAsync(async (req, res) => {
  const stats = await reportsService.getDashboardStats();
  res.send({ status: 'success', data: stats });
});

const getRevenueStats = catchAsync(async (req, res) => {
  const stats = await reportsService.getRevenueStats();
  res.send({ status: 'success', data: stats });
});

module.exports = {
  getDashboardStats,
  getRevenueStats
};
