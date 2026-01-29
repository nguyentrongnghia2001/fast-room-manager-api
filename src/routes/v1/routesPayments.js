const express = require('express');
const paymentsController = require('../../controllers/paymentsController');
const validateObjectId = require('../../middlewares/validateObjectId');

const router = express.Router();

router
  .route('/')
  .post(paymentsController.createPayment)
  .get(paymentsController.getPayments);

router
  .route('/:id')
  .get(validateObjectId, paymentsController.getPayment)
  .put(validateObjectId, paymentsController.updatePayment)
  .delete(validateObjectId, paymentsController.deletePayment);

module.exports = router;
