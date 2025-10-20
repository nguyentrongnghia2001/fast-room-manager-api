const { StatusCodes } = require('http-status-codes');
const { successHandler } = require('../middlewares/responseState');
const ContractService = require('../services/serviceContracts');

exports.listContracts = async (req, res, next) => {
  try {
    const contracts = await ContractService.listContracts();
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, contracts, 'Contracts found successfully'));
  } catch (err) {
    next(err);
  }
};

exports.createContract = async (req, res, next) => {
  try {
    const payload = req.body;
    const contract = await ContractService.createContract(payload);
    res.status(StatusCodes.CREATED).json(successHandler(StatusCodes.CREATED, contract, 'Contract created successfully'));
  } catch (err) {
    // Normalize common Mongoose errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      err.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
      err.message = 'Validation error: ' + messages.join(', ');
    };
    if (err.code === 11000) {
      err.statusCode = StatusCodes.CONFLICT;
      err.message = 'Duplicate key';
    }
    next(err);
  }
};

exports.getContractById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contract = await ContractService.getContractById(id);
    if (!contract) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Contract not found' });
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, contract, 'Contract found successfully'));
  } catch (err) {
    next(err);
  }
};

exports.updateContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const contract = await ContractService.updateContract(id, updates, {
      new: true,
      runValidators: true,
      context: 'query',
    });
    if (!contract) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Contract not found' });
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, contract, 'Contract updated successfully'));
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      err.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
      err.message = 'Validation error: ' + messages.join(', ');
    };
    if (err.code === 11000) {
      err.statusCode = StatusCodes.CONFLICT;
      err.message = 'Duplicate key';
    }
    next(err);
  }
};

exports.deleteContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contract = await ContractService.deleteContract(id);
    if (!contract) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Contract not found' });
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, contract, 'Contract deleted successfully'));
  } catch (err) {
    next(err);
  }
};