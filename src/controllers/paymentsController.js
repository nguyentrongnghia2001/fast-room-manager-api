const { StatusCodes } = require('http-status-codes');
const pick = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const paymentService = require('../services/servicePayments');

const createPayment = catchAsync(async (req, res) => {
  const payment = await paymentService.createPayment(req.body);
  res.status(StatusCodes.CREATED).send({ status: 'success', data: payment });
});

const getPayments = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['contractId', 'status', 'month']);
  const result = await paymentService.queryPayments(filter);
  res.send({ status: 'success', data: result });
});

const getPayment = catchAsync(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id);
  res.send({ status: 'success', data: payment });
});

const updatePayment = catchAsync(async (req, res) => {
  const payment = await paymentService.updatePaymentById(req.params.id, req.body);
  res.send({ status: 'success', data: payment });
});

const deletePayment = catchAsync(async (req, res) => {
  await paymentService.deletePaymentById(req.params.id);
  res.status(StatusCodes.NO_CONTENT).send();
});

module.exports = {
  createPayment,
  getPayments,
  getPayment,
  updatePayment,
  deletePayment,
};
