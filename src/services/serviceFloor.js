const Floor = require('../models/Floor');
const { StatusCodes } = require('http-status-codes');

async function listFloors() {
  const floors = await Floor.find().lean() || [];
  return floors;
}

async function createFloor(payload) {
  if (!payload || Object.keys(payload).length === 0) {
    const err = new Error('Request body is empty');
    err.statusCode = StatusCodes.BAD_REQUEST;
    throw err;
  }
  const floor = await Floor.create(payload) || {};
  return floor;
}

async function updateFloor(id, payload) {
  if (!payload || Object.keys(payload).length === 0) {
    const err = new Error('Request body is empty');
    err.statusCode = StatusCodes.BAD_REQUEST;
    throw err;
  }
  const floor = await Floor.findByIdAndUpdate(id, payload, { new: true }) || {};
  return floor;
}

async function deleteFloor(id) {
  const floor = await Floor.findByIdAndDelete(id) || {};
  return floor;
}

async function getFloorById(id) {
  const floor = await Floor.findById(id) || {};
  return floor;
}

module.exports = { listFloors, createFloor, updateFloor, deleteFloor, getFloorById };
