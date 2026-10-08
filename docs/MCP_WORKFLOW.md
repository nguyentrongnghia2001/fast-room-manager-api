# Hướng dẫn Kiến trúc & Luồng chạy MCP Server (Fast Room Manager API)

> **Mục tiêu:** Tài liệu mô tả chi tiết kiến trúc, vòng đời request, cơ chế bảo mật và luồng xử lý dữ liệu của **MCP Server (Model Context Protocol)** được tích hợp trực tiếp trong source code `fast-room-manager-api`.

---

## 1. Tổng quan Kiến trúc

MCP Server trong dự án được thiết kế theo mô hình **Streamable HTTP (phiên bản spec 2025-06-18)** và được mount trực tiếp vào ứng dụng Express tại endpoint:

```
POST   /mcp   (JSON-RPC: initialize, tools/list, tools/call)
GET    /mcp   (SSE stream cho server-to-client events)
DELETE /mcp   (Đóng phiên làm việc - session termination)
```

### Điểm nổi bật:
* **Tích hợp nguyên khối (In-Process):** Dùng chung tiến trình Node.js, chia sẻ cùng kết nối MongoDB Mongoose, và tái sử dụng toàn bộ Service layer (`serviceRooms`, `serviceReports`, `serviceRag`...) với REST API hiện tại.
* **100% Read-Only:** Toàn bộ công cụ (tools) chỉ thực hiện các truy vấn đọc, không hỗ trợ thêm/sửa/xóa, đảm bảo an toàn tuyệt đối khi kết nối với các mô hình ngôn ngữ lớn (LLM).
* **Bảo mật danh tính (PII Protection):** Tự động che số CCCD/CMND (`idCard`) và lược bỏ hình ảnh CCCD (`cardImages`) trước khi dữ liệu được nạp vào context của AI.

---

## 2. Sơ đồ Luồng chạy Chi tiết (Flowchart TD)

```mermaid
flowchart TD
  subgraph G1 ["1. Tiếp nhận & Middleware cơ bản"]
    Client(["AI Host: Claude, Cursor, Inspector..."]) -->|"POST /mcp + Headers + JSON-RPC"| ExpEntry["Express App (app.js)"]
    ExpEntry --> MW_Cors["CORS Middleware: Cho phép truy cập, expose Mcp-Session-Id"]
  end

  subgraph G2 ["2. Xác thực (Auth) & Kiểm tra Database"]
    MW_Cors --> MW_Auth{"mcpAuth: Kiểm tra Authorization"}
    MW_Auth -->|"Thiếu header hoặc không đúng định dạng"| Err401["Trả HTTP 401 Unauthorized (RPC code -32001)"]
    MW_Auth -->|"Có header Bearer ..."| TokenCheck{"Loại Token?"}
    
    TokenCheck -->|"Khớp MCP_API_KEY (Khóa tĩnh .env)"| SetUserApiKey["req.user = { id: 'mcp-api-key' }"]
    TokenCheck -->|"JWT Token (từ /api/v1/auth/login)"| VerifyJWT{"jwt.verify(token, JWT_SECRET)"}
    VerifyJWT -->|"Hết hạn / Sai chữ ký"| Err401
    VerifyJWT -->|"Hợp lệ"| SetUserJwt["req.user = { id: payload.sub }"]

    SetUserApiKey --> MW_DB{"dbReady: Kiểm tra MongoDB"}
    SetUserJwt --> MW_DB
    MW_DB -->|"MongoDB chưa kết nối (readyState != 1)"| Err503["Trả HTTP 503 Service Unavailable"]
  end

  subgraph G3 ["3. Định tuyến Session (MCP Session Lifecycle)"]
    MW_DB -->|"DB Sẵn sàng"| CheckHeaderSid{"Có header 'Mcp-Session-Id'?"}

    %% Trường hợp chưa có Session ID
    CheckHeaderSid -->|"KHÔNG CÓ"| CheckInitReq{"Body JSON-RPC là 'initialize'?"}
    CheckInitReq -->|"Không phải initialize"| Err400["Trả HTTP 400: Không có session hợp lệ"]
    CheckInitReq -->|"Là method: initialize"| CreateSession["1. Tạo instance McpServer mới<br/>2. Tạo StreamableHTTPTransport (cấp UUID)<br/>3. Lưu: sessions.set(sid, { transport, userId, ... })"]

    %% Trường hợp đã có Session ID
    CheckHeaderSid -->|"CÓ SID"| LookupSession{"Tìm sid trong sessions Map"}
    LookupSession -->|"Không tồn tại"| Err404["Trả HTTP 404: Session not found"]
    LookupSession -->|"Tồn tại"| CheckUser{"session.userId == req.user.id?"}
    CheckUser -->|"Khác User"| Err403["Trả HTTP 403: Session thuộc về user khác"]
    CheckUser -->|"Đúng User"| UpdateLastSeen["Cập nhật lastSeen = Date.now()"]
  end

  subgraph G4 ["4. Phân giải JSON-RPC & Thực thi Tool"]
    CreateSession --> Dispatch["transport.handleRequest(req, res, req.body)"]
    UpdateLastSeen --> Dispatch

    Dispatch --> ParseMethod{"Loại JSON-RPC Request"}
    ParseMethod -->|"method: 'initialize'"| RespInit["Phản hồi Protocol 2025-06-18 + Header Mcp-Session-Id"]
    ParseMethod -->|"method: 'tools/list'"| RespList["Trả về danh sách 13 tools kèm InputSchema (Zod)"]
    ParseMethod -->|"method: 'tools/call'"| ValidateZod{"Kiểm tra arguments qua Zod Schema"}

    ValidateZod -->|"Sai kiểu/thiếu params bắt buộc"| ErrZod["Trả JSON-RPC Error: Invalid arguments"]
    ValidateZod -->|"Arguments hợp lệ"| RunSafe["Chạy Safe Handler trong tools.js"]
    
    RunSafe --> FetchData["Truy vấn Mongoose (Read-only) / Gọi Service (serviceReports, serviceRag...)"]
  end

  subgraph G5 ["5. Bảo mật dữ liệu & Trả phản hồi"]
    FetchData --> Sanitize["Lọc thông tin nhạy cảm (PII):<br/>- Che số CCCD: '********1234'<br/>- Loại bỏ cardImages, __v"]
    Sanitize --> PackResult["Đóng gói chuẩn kết quả MCP:<br/>- content: [ { type: 'text', text: JSON string } ]<br/>- structuredContent: Plain Object Data"]
    PackResult --> ClientResp(["Trả về AI Host (HTTP Streamable / SSE)"])
  end
```

---

## 3. Chi tiết 5 Giai đoạn Xử lý Request

### Giai đoạn 1: Tiếp nhận Request & CORS
* Request từ AI client gửi đến `POST /mcp`.
* Express middleware xử lý CORS:
  * Cho phép các header cần thiết.
  * Thiết lập `exposedHeaders: ['Mcp-Session-Id', 'WWW-Authenticate']` để Client hoặc giao diện web (như MCP Inspector) có thể lấy và lưu lại ID phiên.

### Giai đoạn 2: Xác thực & Trạng thái Hệ thống (Auth & DB Gate)
Hỗ trợ xác thực kép:
1. **Static API Key (`MCP_API_KEY`):** Được cấu hình trong file `.env`. So sánh chuỗi bảo mật bằng `crypto.timingSafeEqual` để tránh tấn công dò timing. Rất hữu ích cho các AI Client máy tính (Claude Desktop, Cursor) hoạt động lâu dài mà không sợ hết hạn token.
2. **User JWT Token:** Sử dụng token từ REST API endpoint `/api/v1/auth/login`. Xác thực thông qua middleware `verifyToken` với `JWT_SECRET`.
3. **Database Readiness Check (`dbReady`):** Kiểm tra `mongoose.connection.readyState === 1`. Nếu MongoDB đang gián đoạn, ngay lập tức trả về mã HTTP `503` để bảo vệ server khỏi bị treo.

### Giai đoạn 3: Quản lý Phiên (Session Management)
* **Bắt tay ban đầu (Handshake):**
  * Client gửi JSON-RPC `initialize` **không kèm** `Mcp-Session-Id`.
  * Server tạo phiên mới: sinh UUID v4 ngẫu nhiên, khởi tạo instance `McpServer` và `StreamableHTTPServerTransport`, lưu vào `sessions` Map cùng với `userId` của người yêu cầu.
  * Header `Mcp-Session-Id: <uuid>` được trả về kèm phản hồi.
* **Xác thực phiên các lần gọi sau:**
  * Client bắt buộc gửi kèm header `Mcp-Session-Id`.
  * **Cô lập phiên (Session Isolation):** Server đối chiếu `session.userId === req.user.id`. Nếu token của User B cố tình dùng session của User A, request sẽ bị chặn lập tức bằng mã `403`.
* **Tự động dọn dẹp (Idle Sweeper):**
  * Background timer chạy định kỳ mỗi 60 giây. Bất kỳ session nào không có hoạt động (`lastSeen`) quá thời gian cấu hình (`MCP_SESSION_IDLE_MIN`, mặc định 30 phút) sẽ được đóng và giải phóng bộ nhớ.

### Giai đoạn 4: Phân giải Protocol & Thực thi Tool
* SDK `@modelcontextprotocol/sdk` tự động điều phối các method JSON-RPC:
  * `initialize`: Đàm phán phiên bản giao thức và khả năng (capabilities).
  * `notifications/initialized`: Client xác nhận hoàn tất kết nối.
  * `tools/list`: Cung cấp danh mục 13 tools kèm schema quy chuẩn Zod.
  * `tools/call`: Kiểm tra tính hợp lệ của tham số đầu vào bằng Zod (ví dụ: ObjectId phải là chuỗi hex 24 ký tự, format tháng phải là `MM/YYYY`).
* **Bọc an toàn (`safe()` handler):**
  * Bất kỳ lỗi phát sinh từ Database hay Service đều được bắt (catch) và chuyển đổi thành lỗi công cụ chuẩn MCP (`{ isError: true, content: [...] }`), không làm crash process hay ngắt kết nối HTTP transport.

### Giai đoạn 5: Làm sạch Dữ liệu Nhạy cảm (PII Masking) & Đóng gói Phản hồi
* **Lọc bỏ thông tin nhạy cảm:**
  * Thông tin khách thuê được đi qua hàm `maskTenant()`: Số CCCD/CMND (`idCard`) chỉ hiển thị 4 số cuối (ví dụ `********6789`).
  * Danh sách link ảnh thẻ (`cardImages`) và các trường kỹ thuật nội bộ (`__v`) bị loại bỏ hoàn toàn trước khi dữ liệu được gửi đến LLM.
* **Chống ReDoS / Regex Injection:** Mọi chuỗi tìm kiếm text từ người dùng đều được escape bằng hàm `escapeRegex()` trước khi đưa vào biểu thức chính quy của MongoDB.
* **Định dạng đầu ra chuẩn kép:**
  * `content`: Dạng chuỗi JSON (Text) để LLM đọc và suy luận.
  * `structuredContent`: Dạng Javascript Object chuẩn để UI của IDE/Client hiển thị cấu trúc dữ liệu nếu cần.

---

## 4. Danh mục 13 Tools (Read-Only)

| Nhóm | Tên Tool | Input chính | Mô tả chức năng |
|---|---|---|---|
| **Tầng & Phòng** | `list_floors` | *(Không có)* | Liệt kê tất cả các tầng kèm thống kê số phòng theo từng trạng thái (available, occupied, maintenance). |
| | `list_rooms` | `search`, `status`, `type`, `floorId`, `minPrice`, `maxPrice`, `sortBy`, `order`, `page`, `limit` | Tìm kiếm phòng linh hoạt theo nhiều tiêu chí, phân trang đầy đủ, populate tầng. |
| | `get_room` | `id` (ObjectId) | Lấy chi tiết phòng, hợp đồng thuê đang còn hiệu lực, khách thuê hiện tại và 6 hóa đơn gần nhất. |
| **Khách thuê** | `list_tenants` | `search`, `status`, `page`, `limit` | Danh sách khách thuê (đã che CCCD, loại bỏ ảnh thẻ). |
| | `get_tenant` | `id` (ObjectId) | Chi tiết thông tin một khách thuê và lịch sử tất cả các hợp đồng/phòng đã thuê. |
| **Hợp đồng** | `list_contracts` | `status`, `roomId`, `tenantId`, `expiringWithinDays`, `page`, `limit` | Liệt kê hợp đồng thuê. Đặc biệt có `expiringWithinDays` để lọc các hợp đồng sắp hết hạn trong N ngày tới. |
| | `get_contract` | `id` (ObjectId) | Chi tiết hợp đồng, thông tin phòng, khách thuê, danh sách hóa đơn thanh toán và tổng tiền còn nợ (`outstanding`). |
| **Hóa đơn & Báo cáo** | `list_payments` | `status`, `month` (MM/YYYY), `contractId`, `page`, `limit` | Danh sách hóa đơn điện, nước, tiền phòng kèm tổng tiền cần thu và đã thu (`totals`). |
| | `get_payment` | `id` (ObjectId) | Chi tiết một hóa đơn thanh toán kèm hợp đồng và thông tin khách thuê. |
| | `get_dashboard_stats` | *(Không có)* | Thống kê tổng quan: tỉ lệ lấp đầy phòng, số khách thuê, doanh thu tháng này, số tiền đang chờ thanh toán. |
| | `get_revenue_stats` | *(Không có)* | Thống kê doanh thu thực thu tháng này, tỉ lệ tăng trưởng (%) so với tháng trước và số tiền tồn đọng. |
| **Tri thức / RAG** | `list_knowledge_docs` | `status` (indexed, failed, processing) | Danh sách các tài liệu tri thức (nội quy, biểu phí, chính sách cọc...). |
| | `search_knowledge` | `query`, `sourceType`, `roomStatus`, `roomType`, `minPrice`, `maxPrice`, `topK` | Tìm kiếm ngữ nghĩa (Semantic + Hybrid Search) trên tài liệu nội quy và dữ liệu phòng. |

---

## 5. Ví dụ Vòng đời một Cuộc hội thoại Thực tế

Giả sử người dùng hỏi AI: *"Kiểm tra xem có hợp đồng nào sắp hết hạn trong vòng 30 ngày tới không?"*

```
1. Client (LLM)      -> Gửi JSON-RPC method: "tools/call"
                        params: { name: "list_contracts", arguments: { expiringWithinDays: 30 } }
2. Server (Router)   -> Xác thực Bearer Token hợp lệ
3. Server (Session)  -> Tìm thấy Session ID hợp lệ trong bộ nhớ
4. Server (SDK)      -> Validate arguments qua Zod Schema (expiringWithinDays: 30 là integer hợp lệ)
5. Server (Handler)  -> Tính toán: now <= endDate <= now + 30 ngày, status: 'active'
                        Query MongoDB Mongoose: Contract.find(...)
6. Server (Security) -> Hàm maskTenant() ẩn thông tin nhạy cảm của khách thuê
7. Server (Output)   -> Đóng gói JSON trả về Client
8. Client (LLM)      -> Nhận danh sách hợp đồng và sinh câu trả lời tự nhiên bằng tiếng Việt cho người dùng.
```

---

## 6. Hướng dẫn Cấu hình & Kiểm thử

### 6.1. Cấu hình biến môi trường (`.env`)
Thêm các biến cấu hình sau vào file `.env`:
```env
# Khóa tĩnh dùng cho AI Host kết nối MCP (Khuyên dùng)
MCP_API_KEY=your_super_secret_mcp_api_key_here

# Thời gian đóng session không hoạt động (phút)
MCP_SESSION_IDLE_MIN=30
```

### 6.2. Cấu hình Client (Cursor / Claude Desktop / VSCode)
Thêm vào file cấu hình MCP của client:
```json
{
  "mcpServers": {
    "fast-room-manager": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer your_super_secret_mcp_api_key_here"
      }
    }
  }
}
```

### 6.3. Kiểm thử với MCP Inspector
Chạy công cụ trực quan chính thức của Anthropic để test:
```powershell
npx @modelcontextprotocol/inspector
```
1. Chọn Transport: **Streamable HTTP**.
2. Nhập URL: `http://localhost:3000/mcp`.
3. Thêm Header: `Authorization` với giá trị `Bearer your_super_secret_mcp_api_key_here`.
4. Nhấn **Connect** -> Danh sách 13 tools sẽ xuất hiện và có thể test gọi từng tool trực tiếp.

### 6.4. Chạy bộ kiểm thử tự động (Unit / E2E Test)
Dự án đã có sẵn bộ test tự động kiểm tra toàn diện 20 test-cases (xác thực, session, phân quyền, bảo mật PII, toàn bộ 13 tools):
```powershell
npm run test:mcp
```
*(Lưu ý: Test sẽ tự động kết nối MongoDB, tạo database tạm `fast_room_manager_dev_mcp_test` và dọn dẹp sau khi kiểm thử xong, hoàn toàn không ảnh hưởng đến database phát triển).*
