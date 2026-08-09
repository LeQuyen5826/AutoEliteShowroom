# Hướng dẫn nâng cấp bản đã sửa

## 1. Thu hồi secret cũ

Trước khi chạy bản này, hãy đổi mật khẩu database, Gemini API key và JWT secrets từng xuất hiện trong bản ZIP cũ. Không tái sử dụng các giá trị cũ.

## 2. Cài đặt và migrate

```bash
cd showroom-backend-sprint1/showroom-backend
copy .env.example .env
npm ci
npx prisma generate
npx prisma migrate deploy
```

Migration `20260808090000_security_and_integrity` bổ sung refresh session, contact lead, audit thanh toán/hợp đồng, mã kho/VIN, unique review và các index truy vấn.

## 3. Ảnh hưởng tới client

- Refresh token không còn được trả về JSON; trình duyệt nhận cookie HttpOnly.
- Client phải gửi `withCredentials: true` khi frontend/backend khác origin.
- Access token chỉ nằm trong memory và được khôi phục bằng `POST /api/auth/refresh`.
- Tệp hợp đồng phải tải qua `GET /api/orders/:id/contract/file` với access token.
- Phiên chat khách có header `X-Chat-Session-Token`.

## 4. Checklist production

- Dùng HTTPS và cấu hình chính xác `CORS_ORIGIN`.
- Chạy frontend/backend theo cùng site nếu dùng cookie `SameSite=Lax`.
- Thay rate limiter trong memory bằng Redis khi chạy nhiều backend instance.
- Chuyển hợp đồng/ảnh sang private object storage và signed URL.
- Thiết lập backup, log tập trung, monitoring và cảnh báo chi phí Gemini.
- Xóa hoặc đổi mật khẩu toàn bộ tài khoản seed.
