# MCP server — Fast Room Manager

MCP (Streamable HTTP, protocol `2025-06-18`) được mount vào app Express tại **`/mcp`**. Nó chạy cùng `npm start`, dùng chung kết nối Mongo và service với REST API.

**Read-only**: các tool chỉ đọc dữ liệu, không tạo/sửa/xóa gì. Số CCCD (`idCard`) của khách thuê bị che, chỉ còn 4 số cuối, và `cardImages` bị bỏ khỏi kết quả, vì dữ liệu sẽ được gửi sang LLM bên thứ ba.

## Xác thực
Có 2 cách:
- `Authorization: Bearer <JWT>`: lấy token từ `POST /api/v1/auth/login` (token hết hạn sau `JWT_ACCESS_EXPIRATION_MINUTES`).
- `Authorization: Bearer <MCP_API_KEY>`: khóa tĩnh đặt trong `.env`, tiện cho AI host.

Mỗi session gắn với user đã khởi tạo nó. Dùng session của user khác sẽ bị `403`. Session không hoạt động quá `MCP_SESSION_IDLE_MIN` phút (mặc định 30) sẽ tự đóng.

## Tools
| Tool | Input chính |
|---|---|
| `list_floors` | – (kèm số phòng theo trạng thái) |
| `list_rooms` | `search, status, type, floorId, minPrice, maxPrice, sortBy, order, page, limit` |
| `get_room` | `id` → phòng + hợp đồng đang hiệu lực + 6 hóa đơn gần nhất |
| `list_tenants` / `get_tenant` | `search, status, page, limit` / `id` |
| `list_contracts` | `status, roomId, tenantId, expiringWithinDays, page, limit` |
| `get_contract` | `id` → kèm toàn bộ payments + `outstanding` |
| `list_payments` / `get_payment` | `status, month (MM/YYYY), contractId` (kèm `totals`) / `id` |
| `get_dashboard_stats`, `get_revenue_stats` | – (giống `/api/v1/reports/*`) |
| `list_knowledge_docs`, `search_knowledge` | `status` / `query, sourceType, roomStatus, roomType, minPrice, maxPrice, topK` |

## Cấu hình client
```json
{
  "mcpServers": {
    "fast-room-manager": {
      "url": "http://localhost:3000/mcp",
      "headers": { "Authorization": "Bearer <MCP_API_KEY hoặc JWT>" }
    }
  }
}
```
Debug: `npx @modelcontextprotocol/inspector` → Transport **Streamable HTTP** → URL `http://localhost:3000/mcp` → thêm header `Authorization`.

## Test
```powershell
npm run test:mcp   # cần MongoDB; dùng DB riêng <tên-db>_mcp_test và xóa sau khi chạy
```

## Code
- [`index.js`](./index.js): router `/mcp` (auth, session, POST/GET/DELETE).
- [`tools.js`](./tools.js): định nghĩa tool (zod schema, query read-only).
