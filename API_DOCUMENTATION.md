# API Documentation for Fast Room Manager

This document outlines the API endpoints required to replace the mock data in the `fast-room-manager` project. The backend should be built using **Node.js** and **Express**.

## 1. General Information

- **Base URL**: `/api/v1`
- **Content-Type**: `application/json`
- **Response Format**:
  All successful responses should follow this structure:
  ```json
  {
    "status": "success",
    "data": { ... } | [ ... ]
  }
  ```
  Error responses:
  ```json
  {
    "status": "error" | "fail",
    "message": "Error description"
  }
  ```

## 2. Authentication (Recommended)

Although not explicitly seen in the mock data, a production app requires auth.

- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me` (Get current user profile)

## 3. Floor Management
Used in `src/stores/floor.ts`.

### Get All Floors
- **Endpoint**: `GET /floor`
- **Response**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "_id": "string",
        "name": "Tầng 1",
        "createdAt": "ISOString",
        "updatedAt": "ISOString"
      }
    ]
  }
  ```

## 4. Room Management
Used in `src/stores/rooms.ts`, `RoomListView.vue`, `RoomDetailView.vue`, etc.

### Get All Rooms
- **Endpoint**: `GET /rooms`
- **Query Params**: `?floorId=...&status=...&type=...` (Optional filters)
- **Response**: `data` is an array of `Room` objects (see Types section).

### Get Room Detail
- **Endpoint**: `GET /rooms/:id`
- **Response**: `data` is a single `Room` object.

### Create Room
- **Endpoint**: `POST /rooms`
- **Body**:
  ```json
  {
    "name": "Phòng 101",
    "idFloor": "floor_id",
    "type": "single",
    "area": 20,
    "price": 3000000,
    "deposit": 3000000,
    "status": "available",
    "amenities": ["Wifi", "AC", "Fridge"],
    "description": "...",
    "images": ["url1", "url2"]
  }
  ```

### Update Room
- **Endpoint**: `PUT /rooms/:id`
- **Body**: Partial room object.

### Delete Room
- **Endpoint**: `DELETE /rooms/:id`

## 5. Tenant Management
Used in `src/stores/tenant.ts`, `TenantListView.vue`, `TenantDetailView.vue`.

### Get All Tenants
- **Endpoint**: `GET /tenant`
- **Response**: `data` is an array of `Tenant` objects.

### Get Tenant Detail
- **Endpoint**: `GET /tenant/:id`
- **Response**: `data` is a single `Tenant` object.

### Create Tenant
- **Endpoint**: `POST /tenant`
- **Body**:
  ```json
  {
    "name": "Nguyễn Văn A",
    "phone": "0987654321",
    "email": "a@example.com",
    "idCard": "123456789",
    "address": "Hanoi",
    "emergencyContact": "Mr B",
    "emergencyPhone": "0123456789",
    "status": "active"
  }
  ```

### Update Tenant
- **Endpoint**: `PUT /tenant/:id`

### Delete Tenant
- **Endpoint**: `DELETE /tenant/:id`

## 6. Contract Management
Used in `src/stores/contract.ts`, `ContractListView.vue`, `ContractDetailView.vue`.

### Get All Contracts
- **Endpoint**: `GET /contract`
- **Response**: `data` is an array of `Contract` objects.

### Get Contract Detail
- **Endpoint**: `GET /contract/:id`
- **Response**: `data` is a single `Contract` object.

### Create Contract
- **Endpoint**: `POST /contract`
- **Body**:
  ```json
  {
    "roomId": "room_id",
    "tenantId": "tenant_id",
    "startDate": "2024-01-01",
    "endDate": "2025-01-01",
    "monthlyRent": 3000000,
    "deposit": 3000000
    // status defaults to 'active'
  }
  ```

### Update Contract
- **Endpoint**: `PUT /contract/:id`

## 7. Payments & Transactions
Used in `ReportsView.vue` and `ContractDetailView.vue`.

### Get Payments
- **Endpoint**: `GET /payments`
- **Query Params**: `?contractId=...&status=...&month=...`
- **Response**: `data` is an array of `Payment` objects.
  ```typescript
  interface Payment {
    id: string;
    contractId: string;
    month: string; // "MM/YYYY"
    totalAmount: number;
    status: 'pending' | 'paid' | 'overdue';
    // ... other fields from Type definition
  }
  ```

### Create Payment (Record a bill)
- **Endpoint**: `POST /payments`

### Update Payment (Mark as paid)
- **Endpoint**: `PUT /payments/:id`
- **Body**: `{ "status": "paid", "paidAmount": 3000000, "paidDate": "..." }`

## 8. Reports & Dashboard
Used in `ReportsView.vue`.

### Get Dashboard Stats
- **Endpoint**: `GET /reports/dashboard`
- **Response**:
  ```json
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

### Get Revenue Stats
- **Endpoint**: `GET /reports/revenue`
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "thisMonth": 45000000,
      "growth": 12.5,
      "pending": 8500000
    }
  }
  ```

## 9. Types Reference (from Frontend)
Implement Mongoose schemas or SQL tables based on these interfaces located in `src/types/index.ts`:
- `Room`: `_id, name, idFloor, type, area, price, deposit, status, amenities, images...`
- `Tenant`: `_id, name, phone, email, idCard, address, status...`
- `Contract`: `_id, roomId, tenantId, startDate, endDate, monthlyRent, deposit, status...`
- `Payment`: `id, contractId, month, rentAmount, electricityAmount, waterAmount, totalAmount, status...`
