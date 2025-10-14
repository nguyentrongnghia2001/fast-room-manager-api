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
{ "status": "ok", "scope": "api", "timestamp": "2025-01-01T00:00:00.000Z" }
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

## Error Schema

All errors follow a consistent JSON structure:
```
{ "error": "Message", "details": { /* optional */ } }
```

## Notes
- Consider API versioning via `/api/v1` in future expansions.
- Add request validation using Joi/Zod in dedicated middlewares.