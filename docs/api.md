# API Documentation

This document describes the available endpoints, request/response formats, and error handling for fast-room-manager-api.

Base URL: `http://localhost:3000`
Base Path: `/api`

## Health

### GET /health
Returns service health.

Response 200
```
{ "status": "ok", "service": "fast-room-manager-api", "timestamp": "2025-01-01T00:00:00.000Z" }
```

### GET /api/health
Returns API-scoped health.

Response 200
```
{ "status": "ok", "scope": "api", "versions": ["v1"], "timestamp": "2025-01-01T00:00:00.000Z" }
```

### GET /api/v1/health
Returns API v1 health.

Response 200
```
{ "status": "ok", "scope": "api-v1", "version": "v1", "timestamp": "2025-01-01T00:00:00.000Z" }
```

## Rooms

Resource to manage rooms.

### GET /api/v1/rooms
List all rooms.

Responses
- 200
```
{ "data": [
  {
    "_id": "...",
    "name": "Room A",
    "floor": 2,
    "type": "single",
    "status": "available",
    "amenities": ["wifi", "ac"],
    "description": "...",
    "images": [],
    "createdAt": "...",
    "updatedAt": "..."
  }
] }
```
- 503 (Database not connected)
```
{ "error": "Database not connected" }
```

### POST /api/v1/rooms
Create a new room.

Request Body
```
{
  "name": "Room A",
  "floor": 2,
  "type": "single",        // optional, enum: single|double|family (default single)
  "status": "available",   // optional, enum: available|occupied|maintenance (default available)
  "amenities": ["wifi", "ac"], // optional
  "description": "Sea view",
  "images": ["https://.../img1.jpg"]
}
```

Responses
- 201
```
{ "data": { "_id": "...", "name": "Room A", "floor": 2, "type": "single", "status": "available", "amenities": ["wifi", "ac"], "description": "Sea view", "images": [], "createdAt": "...", "updatedAt": "..." } }
```
- 422 (Validation/business rule error)
```
{ "error": "Validation failed", "details": { /* Mongoose validation errors */ } }
```
- 503 (Database not connected)
```
{ "error": "Database not connected" }
```

### GET /api/v1/rooms/:id
Get a room by ID.

Responses
- 200
```
{ "data": { "_id": "...", "name": "Room A", "floor": 2, "type": "single", "status": "available", "amenities": [], "description": "", "images": [], "createdAt": "...", "updatedAt": "..." } }
```
- 400 (Invalid ID)
```
{ "error": "Invalid ID format" }
```
- 404 (Not found)
```
{ "error": "Room not found" }
```

### PUT /api/v1/rooms/:id
Update a room by ID.

Request Body (any fields to update)
```
{
  "name": "Room A (Updated)",
  "status": "maintenance",
  "amenities": ["wifi", "tv"]
}
```

Responses
- 200
```
{ "data": { "_id": "...", "name": "Room A (Updated)", "floor": 2, "type": "single", "status": "maintenance", "amenities": ["wifi", "tv"], "description": "", "images": [], "createdAt": "...", "updatedAt": "..." } }
```
- 400 (Invalid ID)
```
{ "error": "Invalid ID format" }
```
- 404 (Not found)
```
{ "error": "Room not found" }
```

### DELETE /api/v1/rooms/:id
Delete a room by ID.

Responses
- 204 No Content
- 400 (Invalid ID)
```
{ "error": "Invalid ID format" }
```
- 404 (Not found)
```
{ "error": "Room not found" }
```

## Authentication

Authentication endpoints to register/login and fetch the current user.

Base path: `/api/v1/auth`

### POST /api/v1/auth/register
Register a new user.

Request Body
```
{
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "password": "yourStrongPassword"
}
```

Responses
- 201
```
{
  "user": { "_id": "...", "name": "Nguyen Van A", "email": "a@example.com", "role": "user", "createdAt": "...", "updatedAt": "..." },
  "token": "<jwt_access_token>"
}
```
- 400 (Email already taken / bad request)
```
{ "error": "Email already taken" }
```
- 503 (Database not connected)
```
{ "error": "Database not connected" }
```

### POST /api/v1/auth/login
Login using email and password.

Request Body
```
{
  "email": "a@example.com",
  "password": "yourStrongPassword"
}
```

Responses
- 200
```
{
  "user": { "_id": "...", "name": "Nguyen Van A", "email": "a@example.com", "role": "user", "createdAt": "...", "updatedAt": "..." },
  "token": "<jwt_access_token>"
}
```
- 401 (Incorrect email or password)
```
{ "error": "Incorrect email or password" }
```

### GET /api/v1/auth/me
Get current user profile.

Headers
```
Authorization: Bearer <jwt_access_token>
```

Responses
- 200
```
{ "_id": "...", "name": "Nguyen Van A", "email": "a@example.com", "role": "user", "createdAt": "...", "updatedAt": "..." }
```
- 401 (Missing/invalid token)
```
{ "error": "Please authenticate" }
```

## Payments

Resource to manage payments (bills/transactions).

Base path: `/api/v1/payments`

### GET /api/v1/payments
List payments.

Query Params (optional)
- `contractId`: Contract id
- `status`: `pending|paid|overdue`
- `month`: `MM/YYYY`

Responses
- 200
```
{
  "status": "success",
  "data": [
    {
      "_id": "...",
      "contractId": "...",
      "month": "01/2026",
      "rentAmount": 3000000,
      "electricityAmount": 0,
      "waterAmount": 0,
      "totalAmount": 3000000,
      "paidAmount": 0,
      "paidDate": null,
      "status": "pending",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### POST /api/v1/payments
Create a payment (record a bill).

Request Body
```
{
  "contractId": "<contract_object_id>",
  "month": "01/2026",
  "rentAmount": 3000000,
  "electricityAmount": 200000,
  "waterAmount": 100000,
  "totalAmount": 3300000
}
```

Responses
- 201
```
{ "status": "success", "data": { "_id": "...", "contractId": "...", "month": "01/2026", "rentAmount": 3000000, "electricityAmount": 200000, "waterAmount": 100000, "totalAmount": 3300000, "status": "pending", "createdAt": "...", "updatedAt": "..." } }
```

### GET /api/v1/payments/:id
Get payment detail by id.

Responses
- 200
```
{ "status": "success", "data": { "_id": "...", "contractId": "...", "month": "01/2026", "totalAmount": 3300000, "status": "pending" } }
```
- 400 (Invalid ID)
```
{ "error": "Invalid ID format" }
```
- 404 (Not found)
```
{ "error": "Payment not found" }
```

### PUT /api/v1/payments/:id
Update a payment (e.g. mark as paid).

Request Body (example)
```
{ "status": "paid", "paidAmount": 3300000, "paidDate": "2026-01-29T00:00:00.000Z" }
```

Responses
- 200
```
{ "status": "success", "data": { "_id": "...", "status": "paid", "paidAmount": 3300000, "paidDate": "..." } }
```

### DELETE /api/v1/payments/:id
Delete a payment.

Responses
- 204 No Content

## Reports

Endpoints to support dashboard and revenue widgets.

Base path: `/api/v1/reports`

### GET /api/v1/reports/dashboard
Get dashboard statistics.

Responses
- 200
```
{
  "status": "success",
  "data": {
    "totalRooms": 10,
    "occupiedRooms": 8,
    "availableRooms": 2,
    "maintenanceRooms": 0,
    "totalTenants": 8,
    "monthlyRevenue": 45000000,
    "pendingPayments": 8500000,
    "overduePayments": 0
  }
}
```

### GET /api/v1/reports/revenue
Get revenue statistics.

Responses
- 200
```
{
  "status": "success",
  "data": {
    "thisMonth": 45000000,
    "growth": 12.5,
    "pending": 8500000
  }
}
```

## Success Schema

Most endpoints return success responses following this structure:
```
{ "statusCode": 200, "status": "success", "data": { /* ... */ }, "message": "..." }
```
Some endpoints (e.g. `/api/v1/auth/*`) may return `{ "user": ..., "token": ... }`.

## Error Schema

All errors follow a consistent JSON structure:
```
{ "error": "Message", "details": { /* optional */ } }
```

## Notes
- Consider API versioning via `/api/v1` in future expansions.
- Add request validation using Joi/Zod in dedicated middlewares.