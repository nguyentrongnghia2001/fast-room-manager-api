const { StatusCodes } = require('http-status-codes');
const { successHandler } = require('../middlewares/responseState');
const TenantService = require('../services/serviceTenants');

exports.listTenants = async (req, res, next) => {
  try {
    const tenants = await TenantService.listTenants();
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, tenants, 'Tenants found successfully'));
  } catch (err) {
    next(err);
  }
};

exports.createTenant = async (req, res, next) => {
  try {
    const payload = req.body;
    const tenant = await TenantService.createTenant(payload);
    res.status(StatusCodes.CREATED).json(successHandler(StatusCodes.CREATED, tenant, 'Tenant created successfully'));
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

exports.getTenantById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenant = await TenantService.getTenantById(id);
    if (!tenant) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Tenant not found' });
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, tenant, 'Tenant found successfully'));
  } catch (err) {
    next(err);
  }
};

exports.updateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const tenant = await TenantService.updateTenant(id, updates, {
      new: true,
      runValidators: true,
      context: 'query',
    });
    if (!tenant) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Tenant not found' });
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, tenant, 'Tenant updated successfully'));
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

exports.deleteTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenant = await TenantService.deleteTenant(id);
    if (!tenant) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Tenant not found' });
    res.status(StatusCodes.OK).json(successHandler(StatusCodes.OK, tenant, 'Tenant deleted successfully'));
  } catch (err) {
    next(err);
  }
};