# reMini Backend (NestJS + Prisma + PostgreSQL)

Backend API cho Zalo Mini App **reMini** (thuộc **Hộ kinh doanh A**).

## 1. Chạy trên máy (PostgreSQL cài trực tiếp)

1. Tạo database `remini_db` trong PostgreSQL của bạn, rồi cập nhật `DATABASE_URL` trong file `.env`.
2. Chạy migration & tạo dữ liệu mẫu:

```bash
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

- API Base URL: `http://localhost:4000/api`
- Swagger UI: `http://localhost:4000/api/docs`

## 2. Chạy trên VPS (Node.js + PM2)

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run build

# Chạy bằng PM2
pm2 start dist/main.js --name remini-api
```

## 3. Các API chính

| Method | Endpoint | Mô tả | Bảo vệ |
|---|---|---|---|
| `GET` | `/api/health` | Kiểm tra API & PostgreSQL | Public |
| `POST` | `/api/leads` | Nhận form đăng ký tư vấn từ Mini App | Public |
| `GET` | `/api/leads` | Xem danh sách khách hàng tư vấn | Header `x-admin-key` |
| `PATCH` | `/api/leads/:id/status` | Cập nhật trạng thái lead (`NEW`, `CONTACTED`, `CONVERTED`, `ARCHIVED`) | Header `x-admin-key` |
| `GET` | `/api/templates` | Danh sách mẫu Mini App | Public |
| `POST` | `/api/submissions` | Lưu dữ liệu tương tác thử từ các mẫu (đơn KCN, đặt lịch...) | Public |

## 4. Phân quyền (cập nhật)

Mọi API quản trị nhận **một trong hai** cách xác thực:

- `Authorization: Bearer <JWT>` (đăng nhập Google từ trang quản trị)
- `x-admin-key: <ADMIN_API_KEY>` (script / công cụ nội bộ)

| Nhóm API | Ai được gọi |
|---|---|
| `GET /api/stores/public/:slug`, `POST /api/leads`, `POST /api/submissions`, `GET /api/templates`, `GET /api/subscriptions/plans` | Public |
| `/api/stores/**`, `/api/stores/:id/media/**` | Chủ shop (chỉ store của mình) hoặc quản trị viên |
| `/api/customers/**`, ghi `/api/subscriptions/**`, `GET /api/leads`, `GET /api/submissions` | Chỉ quản trị viên |

Quản trị viên = `x-admin-key`, user có `role = "admin"`, hoặc email nằm trong `ADMIN_EMAILS`.
Chủ shop tạo store lần đầu sẽ tự được gắn với một `PlatformCustomer` mới.
Bắt buộc đặt `JWT_SECRET` (>= 16 ký tự) khi chạy production.

## 5. OAuth 2.0 – kênh kết nối & token

Mô hình giống django-oauth-toolkit: mỗi **kênh** của khách (Mini App, website, POS, webhook…) là một
`OAuthApplication` có `client_id` + `client_secret` riêng. Token là chuỗi ngẫu nhiên, DB chỉ lưu SHA-256.

| Endpoint | Mô tả |
|---|---|
| `POST /api/oauth/token` | Cấp token. `grant_type` = `client_credentials` \| `refresh_token` \| `zalo_mini_app` |
| `POST /api/oauth/revoke` | Thu hồi token (RFC 7009) |
| `POST /api/oauth/introspect` | Kiểm tra token (RFC 7662), chỉ confidential client |
| `GET/POST/PATCH/DELETE /api/oauth/applications` | Quản lý kênh (chủ shop: kênh của mình; admin: tất cả) |
| `POST /api/oauth/applications/:id/rotate-secret` | Đổi secret (secret chỉ hiện 1 lần) |
| `POST /api/oauth/applications/:id/revoke-tokens` | Đăng xuất mọi phiên của kênh |

```bash
# Máy chủ ↔ máy chủ
curl -X POST http://localhost:4000/api/oauth/token -u "rmc_xxx:rms_xxx" -d grant_type=client_credentials
# Làm mới (refresh token xoay vòng; dùng lại refresh cũ → thu hồi toàn bộ phiên)
curl -X POST http://localhost:4000/api/oauth/token -d grant_type=refresh_token -d client_id=remini-zalo-miniapp -d refresh_token=rmr_xxx
```

**Đăng nhập Zalo trong Mini App** (`grant_type=zalo_mini_app`, client public `remini-zalo-miniapp`):
Mini App gửi `zalo_access_token` (getAccessToken) + `phone_token` (getPhoneNumber). Backend gọi
`graph.zalo.me/v2.0/me` lấy hồ sơ và `graph.zalo.me/v2.0/me/info` (kèm `ZALO_APP_SECRET`) lấy số điện thoại.

**Lịch gọi lại:** `POST /api/leads` nhận thêm `requestType=callback`, `callbackDate=YYYY-MM-DD`,
`callbackSlot` (xem `GET /api/leads/callback-slots`). Gửi kèm Bearer token Zalo → lead được gắn tài khoản,
`phoneVerified=true` nếu trùng SĐT Zalo. Giới hạn 5 yêu cầu / 10 phút / IP.
