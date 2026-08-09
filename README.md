# Smart Car Showroom

Nền tảng quản lý showroom ô tô gồm REST API Node.js/Express/TypeScript/Prisma và giao diện React/Vite/TypeScript.

## Cấu trúc

- `showroom-backend-sprint1/showroom-backend`: API, Prisma schema/migrations và chatbot Gemini.
- `showroom-frontend-sprint1/showroom-frontend`: website khách hàng và trang quản trị.

## Chạy development

Yêu cầu Node.js 20+, npm 10+ và PostgreSQL 16 có extension pgvector.

### Backend

```bash
cd showroom-backend-sprint1/showroom-backend
copy .env.example .env
npm ci
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Hãy thay `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` và `GEMINI_API_KEY` trong `.env`. Hai JWT secret nên là chuỗi ngẫu nhiên ít nhất 32 ký tự. Không commit hoặc gửi file `.env` cho người khác.

### Frontend

```bash
cd showroom-frontend-sprint1/showroom-frontend
npm ci
npm run dev
```

Frontend chạy tại `http://localhost:5173`; Vite proxy `/api` sang backend tại `http://localhost:3000`.

## Thay đổi bảo mật và toàn vẹn dữ liệu

- Refresh token nằm trong cookie HttpOnly và được rotation/revoke bằng bảng `refresh_sessions`.
- Đặt xe và thanh toán dùng transaction; đơn hàng có quy tắc chuyển trạng thái.
- Hợp đồng chỉ tải qua API đã xác thực, không public thư mục uploads.
- Chatbot dùng token riêng theo session, rate limit và giới hạn độ dài tin nhắn.
- Staff bị giới hạn dữ liệu theo chi nhánh.
- Form liên hệ lưu dữ liệu thật vào `contact_leads`.
- Review yêu cầu đơn hàng hoàn tất và có unique constraint theo khách/xe.

## Production

```bash
npx prisma migrate deploy
npm run build
npm start
```

Trong production, bắt buộc cấu hình `CORS_ORIGIN`, HTTPS, secret manager, backup database và rate limiter dùng Redis nếu chạy nhiều instance. Không dùng `prisma db push` cho production.

## Tài khoản seed

Dữ liệu seed chỉ dành cho local development. Hãy đổi hoặc xóa các tài khoản mẫu trước khi triển khai môi trường thật.
