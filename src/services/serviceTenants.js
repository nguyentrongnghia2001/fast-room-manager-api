const Tenant = require('../models/Tenant');
const { StatusCodes } = require('http-status-codes');

async function listTenants() {
  const tenants = await Tenant.find().lean() || [];
  return tenants;
}

async function createTenant(payload) {
  if (!payload || Object.keys(payload).length === 0) {
    const err = new Error('Request body is empty');
    err.statusCode = StatusCodes.BAD_REQUEST;
    throw err;
  }
  const tenant = await Tenant.create(payload) || {};
  return tenant;
}

async function updateTenant(id, payload) {
  if (!payload || Object.keys(payload).length === 0) {
    const err = new Error('Request body is empty');
    err.statusCode = StatusCodes.BAD_REQUEST;
    throw err;
  }
  const tenant = await Tenant.findByIdAndUpdate(id, payload, { new: true }) || {};
  return tenant;
}

async function deleteTenant(id) {
  const tenant = await Tenant.findByIdAndDelete(id) || {};
  return tenant;
}

async function getTenantById(id) {
  const tenant = await Tenant.findById(id) || {};
  return tenant;
}

module.exports = { listTenants, createTenant, updateTenant, deleteTenant, getTenantById };
