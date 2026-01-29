const httpStatus = require('http-status-codes');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');

const createPayment = async (paymentBody) => {
  return Payment.create(paymentBody);
};

const queryPayments = async (filter, options) => {
  // Simple find for now, can be improved with pagination if needed
  const payments = await Payment.find(filter).populate('contractId');
  return payments;
};

const getPaymentById = async (id) => {
  const payment = await Payment.findById(id).populate('contractId');
  if (!payment) {
    throw new ApiError(httpStatus.StatusCodes.NOT_FOUND, 'Payment not found');
  }
  return payment;
};

const updatePaymentById = async (paymentId, updateBody) => {
  const payment = await getPaymentById(paymentId);
  Object.assign(payment, updateBody);
  await payment.save();
  return payment;
};

const deletePaymentById = async (paymentId) => {
  const payment = await getPaymentById(paymentId);
  await payment.deleteOne();
  return payment;
};

module.exports = {
  createPayment,
  queryPayments,
  getPaymentById,
  updatePaymentById,
  deletePaymentById,
};
