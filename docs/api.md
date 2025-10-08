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

## Rooms

Resource to manage rooms.

### GET /api/rooms
List all rooms.

Responses
- 200
```
{ "data": [ { "_id": "...", "name": "Room A", "capacity": 10, "status": "available", "createdAt": "...", "updatedAt": "..." } ] }
```
- 503 (Database not connected)
```
{ "error": "Database not connected" }
```

### POST /api/rooms
Create a new room.

Request Body
```
{
  "name": "Room A",
  "capacity": 10,
  "status": "available" // optional, default is "available"
}
```

Responses
- 201
```
{ "data": { "_id": "...", "name": "Room A", "capacity": 10, "status": "available", "createdAt": "...", "updatedAt": "..." } }
```
- 422 (Validation/business rule error)
```
{ "error": "Capacity must be greater than 0" }
```
- 503 (Database not connected)
```
{ "error": "Database not connected" }
```

## Error Schema

All errors follow a consistent JSON structure:
```
{ "error": "Message", "details": { /* optional */ } }
```

## Notes
- Consider API versioning via `/api/v1` in future expansions.
- Add request validation using Joi/Zod in dedicated middlewares.