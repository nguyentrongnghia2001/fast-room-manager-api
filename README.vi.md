# fast-room-manager-api (Tiếng Việt)

API quản lý phòng xây dựng bằng Node.js (Express). Repo được khởi tạo với cấu hình bảo mật tối thiểu cần thiết và quy tắc dự án rõ ràng.

## Tính năng
- Thiết lập Express an toàn (helmet, CORS, phân tích JSON, logging)
- Endpoint kiểm tra sức khỏe: `/health`, `/api/health`
- Tích hợp MongoDB qua Mongoose (tuỳ chọn; ứng dụng vẫn chạy nếu chưa cấu hình DB)
- Tài nguyên Room: liệt kê và tạo mới
- Xử lý lỗi tập trung và 404

## Công nghệ
- Node.js (LTS)
- Express.js
- MongoDB + Mongoose
- dotenv, helmet, cors, morgan
- nodemon (development)

## Bắt đầu

### Yêu cầu
- Node.js LTS
- npm

### Thiết lập
```
npm install
cp .env.example .env
# Chỉnh sửa .env nếu cần
```

### Chạy
```
npm run dev   # chạy với nodemon
# hoặc
npm start     # chạy với node
```

Server chạy tại `http://localhost:3000` theo mặc định.

### Endpoint
- `GET /health` – kiểm tra sức khỏe root
- `GET /api/health` – kiểm tra sức khỏe phạm vi API
- `GET /api/v1/health` – kiểm tra sức khỏe API v1
- `GET /api/v1/rooms` – liệt kê phòng (cần kết nối MongoDB)
- `POST /api/v1/rooms` – tạo phòng (cần kết nối MongoDB)
- `GET /api/v1/rooms/:id` – xem chi tiết phòng
- `PUT /api/v1/rooms/:id` – cập nhật phòng
- `DELETE /api/v1/rooms/:id` – xoá phòng

## Cấu trúc dự án
```
src/
  index.js       # điểm vào server
  app.js         # ứng dụng express & middlewares
  routes/        # định nghĩa routes cơ bản
  middlewares/   # notFound & errorHandler
  models/        # Mongoose models
  controllers/   # HTTP handlers
  config/        # env và kết nối DB
```

## Quy tắc dự án
Xem `.trae/rules/project_rules.md` để biết quy ước và thực hành tốt.

## Cấu hình MongoDB

### Tuỳ chọn A: MongoDB cục bộ
1. Cài đặt MongoDB Community Server
2. Khởi chạy dịch vụ MongoDB
3. Thiết lập `MONGO_URI` trong `.env` (ví dụ đã cung cấp):
   `MONGO_URI=mongodb://127.0.0.1:27017/fast_room_manager_dev`

### Tuỳ chọn B: MongoDB Atlas
1. Tạo cluster miễn phí
2. Whitelist địa chỉ IP của bạn
3. Lấy connection string và đặt `MONGO_URI` trong `.env`:
   `MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority`

Sau khi thiết lập `MONGO_URI`, khởi động lại server dev (`npm run dev`).

## Biến môi trường
- `PORT` – cổng API (mặc định: 3000)
- `NODE_ENV` – môi trường (development/production)
- `MONGO_URI` – chuỗi kết nối MongoDB

## Thiết kế API & Phiên bản hóa
- Base path: `/api` (cân nhắc phiên bản hoá qua `/api/v1`).
- Tài nguyên RESTful (danh từ) với các HTTP verb tiêu chuẩn.
- Phản hồi JSON thống nhất.

## Định dạng lỗi
Các lỗi được trả về theo cấu trúc JSON thống nhất:
```
{
  "error": "Thông điệp mô tả lỗi",
  "details": { /* tuỳ chọn */ }
}
```
- 404: `{ error: "Not Found" }`
- 503 (chưa kết nối DB): `{ error: "Database not connected" }`
- 500: `{ error: "Internal Server Error" }`

## Scripts
- `npm run dev` – chạy server phát triển với nodemon
- `npm start` – chạy server sản xuất

## Tài liệu
- Xem `src/*/README.md` cho quy ước từng thư mục.
- Xem `docs/api.md` cho chi tiết endpoint và ví dụ.

## Đóng góp
1. Fork và clone repository
2. Tạo branch tính năng: `feat/<ten-tinh-nang>`
3. Tuân thủ quy tắc và quy ước dự án
4. Mở Pull Request với mô tả rõ ràng

## Giấy phép
ISC (xem package.json). Bạn có thể sử dụng và điều chỉnh mã nguồn theo điều khoản của giấy phép ISC.