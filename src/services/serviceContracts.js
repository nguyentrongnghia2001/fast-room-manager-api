const Contract = require('../models/Contract');
const { StatusCodes } = require('http-status-codes');

async function listContracts() {
  const contracts = await Contract.find().lean() || [];
  return contracts;
}

async function createContract(payload) {
  if (!payload || Object.keys(payload).length === 0) {
    const err = new Error('Request body is empty');
    err.statusCode = StatusCodes.BAD_REQUEST;
    throw err;
  }
  const contract = await Contract.create(payload) || {};
  return contract;
}

async function updateContract(id, payload) {
  if (!payload || Object.keys(payload).length === 0) {
    const err = new Error('Request body is empty');
    err.statusCode = StatusCodes.BAD_REQUEST;
    throw err;
  }
  const contract = await Contract.findByIdAndUpdate(id, payload, { new: true }) || {};
  return contract;
}

async function deleteContract(id) {
  const contract = await Contract.findByIdAndDelete(id) || {};
  return contract;
}

async function getContractById(id) {
  const contract = await Contract.findById(id) || {};
  return contract;
}

module.exports = { listContracts, createContract, updateContract, deleteContract, getContractById };