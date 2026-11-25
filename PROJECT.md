# reMini / recloud.vn — Tổng quan dự án

> Cập nhật: 2026-11-19. Danh sách việc: xem [TASKS.md](./TASKS.md).

## 1. Sản phẩm

**reMini** (thuộc Hộ kinh doanh A) thiết kế & triển khai Zalo Mini App trọn gói cho doanh nghiệp.

| Thành phần | Vai trò |
|---|---|
| **Mini App reMini** (`demo-mini-app-store/`) | Chỉ để **demo & tiếp thị**: 20 mẫu Mini App theo ngành, bảng giá, quy trình, form tư vấn / đặt lịch gọi lại. Khách đã ký hợp đồng **đăng nhập Zalo** ở tab "Tài khoản" để xem Mini App đã đăng, tiến độ dự án, ticket hỗ trợ. **Không có trình thiết kế** trong Mini App. |
| **Web quản trị** (`frontend/`) | Landing + `/admin/*` quản trị cửa hàng (store/CRM/lịch hẹn/album/trình thiết kế — chủ shop) + `/controller/*` trang điều hành nền tảng (khách reMini, hộp thư, lịch gọi lại, dự án & ticket, công nợ, tài khoản quản trị, chống spam, API — chỉ quản trị viên). |
| **Backend** (`backend/`) | NestJS + Prisma + PostgreSQL. API cho cả hai bên trên. |

## 2. Cấu trúc thư mục (`c:\Dev\zalo-mini-app\demo\`)

```
customer-app/           Các Zalo Mini App viết riêng cho từng khách (mỗi khách một thư mục con, xem README)
demo-mini-app-store/   Zalo Mini App (React 18, Vite 5, zmp-ui, zmp-sdk, jotai, Tailwind)
  src/templates/<id>/  20 mẫu demo (index.ts = meta, data.ts, pages/, nav.tsx)
  src/templates/_shared/kit/  component dùng chung của mẫu (layout, product, cart, account, referral…)
  src/assets/items/<templateId>/<itemId|banner-n>.jpg   ảnh sản phẩm/banner đúng từng món
  src/assets/thumbs/<templateId>.jpg   ảnh thu nhỏ dạng mockup iPhone (1080×900)
  src/pages/           trang showcase: home, pricing, process, clients, contact, account
  src/utils/           auth.ts (đăng nhập Zalo + token), api.ts (lead), portal-api.ts, share.ts, zalo.ts
  src/config.ts        đọc VITE_API_URL, VITE_ZALO_APP_ID, VITE_OAUTH_CLIENT_ID
frontend/              Vite + React + TS + Ant Design v6 + Tailwind + react-icons + dayjs
  src/components/StoreConsole.tsx      khung trang quản trị (sidebar, các section)
  src/components/PlatformViews.tsx     Lịch gọi lại, Kết nối API (OAuth)
  src/components/PortalAdminViews.tsx  Dự án & Ticket, Chống spam
  src/data/store-api.ts / platform-api.ts / auth.ts
  src/miniapp-builder/                 trình thiết kế (chỉ dùng trong web quản trị)
backend/               NestJS 10 + Prisma 5 + PostgreSQL (chạy native, không Docker)
  prisma/schema.prisma, prisma/migrations/, prisma/seed.ts
  src/common/guards/   app-auth.guard.ts (JWT | OAuth | x-admin-key), rate-limit.guard.ts
  src/oauth/           OAuth 2.0 (token/revoke/introspect, quản lý kênh), zalo.service.ts
  src/antispam/        bộ chống spam
  src/notify/          thông báo nhân viên (Telegram, webhook)
  src/audit/           nhật ký thao tác quản trị
  src/inbox/           hộp thư khách (Mini App + Zalo OA), ảnh khách riêng tư (URL ký), việc chăm sóc, webhook OA
  src/builds/          yêu cầu build Mini App riêng của gian hàng (StoreBuildRequest: chờ reMini duyệt → chờ Zalo duyệt → đã phát hành)
  src/debts/           công nợ khách hàng (Debt, DebtPayment; trạng thái tính khi đọc)
  src/jobs/            cron: nhắc lịch gọi lại (mỗi phút), dọn dữ liệu (3:15 sáng)
  test/                unit.test.ts, api.test.ts, start-test-server.js
  src/portal/          /api/me/* (cổng khách hàng) + /api/admin/* (dự án, ticket)
  src/leads/ stores/ media/ customers/ subscriptions/ submissions/ templates/ auth/ health/
```

## 3. Xác thực & phân quyền (backend)

`AppAuthGuard` nhận 1 trong 3:

| Header | Ai | Ghi chú |
|---|---|---|
| `x-admin-key: <ADMIN_API_KEY>` | Quản trị nền tảng | script / công cụ nội bộ |
| `Authorization: Bearer rma_...` | Token OAuth (opaque, DB lưu SHA-256) | người dùng Zalo (Mini App) hoặc kênh `client_credentials` |
| `Authorization: Bearer <JWT>` | Đăng nhập Google ở web quản trị | JWT ký bằng `JWT_SECRET` |

- **Admin (quản trị nền tảng)** = tài khoản có `User.role = "admin"` — đánh dấu ở trang **Tài khoản quản trị**
  (`GET/PATCH /api/admin/accounts`). `ADMIN_EMAILS` chỉ để tạo quản trị viên đầu tiên; `x-admin-key` cho script. Decorator `@AdminOnly()`.
- **Chủ shop** chỉ thấy store có `customerId` = `User.customerId`, và chỉ khi `PlatformCustomer.status = "active"`.
  Luồng: đăng nhập Google → `POST /api/auth/register-seller` tạo `PlatformCustomer` ở `pending` → admin bấm **Kích hoạt**
  ở trang Khách hàng reMini → người bán mới tạo được store. `GET /api/auth/me` trả `accountStatus`
  (`admin | unregistered | pending | active | suspended`), web quản trị chặn bằng `AccountGate`.
- **Người dùng Zalo** (`role = "member"`) gắn với `PlatformCustomer` khi SĐT Zalo đã xác minh trùng
  `PlatformCustomer.phone` hoặc `CustomerStaff.phone` (xem `PortalService.resolveCustomerId`).

### Khách của từng gian hàng (`/api/shop/:slug/*`, `src/shop/`)
- Tài khoản khách = `StoreCustomer` của **đúng store đó** (unique `storeId + zaloUserId`): cùng một người Zalo ở 2 store là 2 tài khoản, dữ liệu tách riêng.
- `POST /shop/:slug/auth/zalo { accessToken, phoneToken? }` → token JWT phạm vi `shop` (ký bằng `JWT_SECRET:shop`, 30 ngày; không dùng thay token quản trị được).
  Lấy SĐT bằng App Secret riêng của store (`Store.zaloAppSecretEnc`, mã hoá AES-GCM, nhập ở modal Xuất bản) hoặc `ZALO_APP_SECRET`.
  Có SĐT trùng khách tạo tại quầy (chưa có Zalo) → gắn vào bản ghi đó.
- `GET/PATCH /me`, `GET/POST /me/orders` (giá tính lại từ DB), `GET/POST /me/bookings`.
- Chủ shop quản lý dữ liệu vận hành: `/api/stores/:id/data/<bookings|events|documents|member-tiers|vouchers|orders>` (POST/PATCH/DELETE),
  danh sách trả kèm `GET /api/stores/:id`. Đơn chuyển sang `completed` → cộng chi tiêu/số đơn/điểm (1 điểm/1.000đ × hệ số hạng) và xét lại hạng.
  Web quản trị đồng bộ tự động (`frontend/src/data/store-sync.ts`).
- Album ảnh (`src/albums/`): `StoreAlbum` + `StoreAlbumPhoto` (file ở `uploads-private/albums/`, xem qua `/api/album-photos/:id?exp&sig`),
  link ảnh gốc ở `StoreAlbum.links`. Gửi album → `StoreMessage` (hộp thư store ↔ khách). Chủ shop: `/api/stores/:id/albums*`, `/api/stores/:id/messages*`.

### OA riêng & build app riêng của gian hàng (web quản trị `/admin/settings`, `/admin/oainbox`)
- Gian hàng có App ID + App Secret riêng (`Store.zaloAppId`, `zaloAppSecretEnc`) và có thể có **OA riêng**: OA Secret Key mã hoá ở `Store.oaSecretEnc`,
  token OA ở `OaCredential` (id `store:<storeId>`, tự làm mới). API: `GET/PUT /stores/:id/oa`, `DELETE /stores/:id/oa/token` (chỉ ghi, không trả secret/token).
- Webhook OA của gian hàng: `POST /api/oa/webhook/:slug` (chữ ký = App ID + OA Secret Key của gian hàng đó). Tin vào `Conversation.storeId = <id>`
  (externalKey `<storeId>:<oaUserId>`), chỉ hiện ở hộp thư gian hàng `/stores/:id/inbox/*`; hộp thư reMini (`/inbox/*`) chỉ thấy `storeId = null`.
- Build app riêng: form ở cửa sổ **Xuất bản** (Miniapp → Xuất bản); shop `POST /stores/:id/build-requests` (lưu `snapshot` thiết kế/sản phẩm/ảnh; mỗi gian hàng 1 yêu cầu mở); quản trị duyệt ở `/controller/builds`
  (`PATCH /admin/build-requests/:id` action `approve` | `publish` | `reject`). Phát hành → cập nhật `Store.zaloAppId`.
- Ảnh sản phẩm / slider / logo của gian hàng: tải lên bằng `POST /stores/:storeId/media/upload` (lưu `backend/uploads/`, URL công khai `/uploads/...`), rồi dán URL vào `imageUrl` của sản phẩm / slider.

### OAuth 2.0 (mô hình django-oauth-toolkit)
- Bảng `OAuthApplication` (mỗi **kênh** của khách: `zalo_mini_app | web | pos | api | webhook`) có `clientId` + `clientSecretHash`.
  Public client (Mini App) không có secret. Seed sẵn client public `remini-zalo-miniapp`.
- `POST /api/oauth/token`: `client_credentials`, `refresh_token` (xoay vòng; dùng lại refresh cũ → thu hồi cả phiên), `zalo_mini_app`.
- `POST /api/oauth/revoke`, `POST /api/oauth/introspect`, CRUD `/api/oauth/applications` (+ `rotate-secret`, `revoke-tokens`).
- Tiền tố: `rmc_` client id, `rms_` secret, `rma_` access token, `rmr_` refresh token.

### Đăng nhập Zalo trong Mini App (`demo-mini-app-store/src/utils/auth.ts`)
1. `authorize({ scopes: ["scope.userInfo", "scope.userPhonenumber"] })`
2. `getAccessToken()` + `getPhoneNumber()` → `{ token }` (hết hạn ~2 phút)
3. `POST /api/oauth/token grant_type=zalo_mini_app client_id=remini-zalo-miniapp zalo_access_token phone_token`
4. Backend gọi `graph.zalo.me/v2.0/me` (hồ sơ) và `graph.zalo.me/v2.0/me/info` với header `access_token`, `code`, `secret_key=ZALO_APP_SECRET` (SĐT).
5. Mini App lưu session ở `nativeStorage` (fallback `localStorage`), tự refresh token (`getValidAccessToken`).

## 4. Chống spam (`backend/src/antispam/antispam.service.ts`)
Áp cho `POST /leads`, `POST /submissions`, ticket `/me/tickets*`. Chấm điểm:
honeypot (`website`) → chặn âm thầm · form token `GET /antispam/form-token` (thiếu +40, < 2,5s +50, dùng lại +30) ·
đầu số VN / số dãy · link, từ khoá (`SPAM_KEYWORDS`; từ khoá + link +30) · ≥ 3 lead/SĐT/24h · danh sách chặn `SpamBlock` ·
người dùng Zalo đã xác minh −40. **≥ 40** lưu nhưng ẩn (`ConsultationLead.spamScore`), **≥ 80** từ chối.
IP bị chặn ≥ 5 lần/giờ → tự chặn 24h. Nhật ký ở `SpamEvent`.

## 5. Mô hình dữ liệu chính (`backend/prisma/schema.prisma`)
- `ConsultationLead`: tư vấn / **đặt lịch gọi lại** (`requestType`, `callbackDate`, `callbackSlot`), `userId`, `phoneVerified`, `staffNote`, `spamScore`.
- `User`, `PlatformCustomer`, `CustomerStaff`, `SubscriptionPlan`, `Subscription`.
- `Store` + `StoreProduct/Customer/Media/Banner/Order/Booking/...` (`builderSchema` = thiết kế từ web quản trị).
- `Project` + `ProjectMilestone` (tiến độ), `SupportTicket` + `TicketMessage`.
- `OAuthApplication`, `OAuthAccessToken`, `OAuthRefreshToken`.
- `SpamBlock`, `SpamEvent`.
- Migration: tạo bằng `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <db tạm> --script`
  rồi `prisma migrate deploy` (DB dev trước đây dùng `db push`; migration `20261119120000_sync_existing_tables` đã đánh dấu applied).

## 6. Biến môi trường

| File | Biến |
|---|---|
| `backend/.env` | `DATABASE_URL`, `PORT`, `NODE_ENV`, `ADMIN_API_KEY`, `JWT_SECRET` (≥16 ký tự), `ADMIN_EMAILS`, `CORS_ORIGINS`, `FRONTEND_URL`, `PUBLIC_API_ORIGIN`, `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL`, `ZALO_APP_SECRET`, `ZALO_CORS`, `ANTISPAM_SECRET`, `SPAM_KEYWORDS`, `TRUST_PROXY` — mẫu: `.env.example` |
| `frontend/.env` | `VITE_API_URL`, `VITE_ZALO_APP_ID`, `VITE_ZALO_ENV`, `VITE_ZALO_VERSION` |
| `demo-mini-app-store/.env` | `APP_ID`, `ZMP_TOKEN` (deploy), `VITE_API_URL`, `VITE_ZALO_APP_ID`, `VITE_OAUTH_CLIENT_ID` — mẫu: `.env.example` |

Không commit / in ra giá trị `.env`.

## 7. Lệnh thường dùng (Windows, máy có proxy công ty)

```bash
# Backend
cd backend && npm run start:dev            # http://localhost:4000/api, Swagger /api/docs
npx tsc --noEmit -p .                      # typecheck
npx prisma migrate deploy && npm run prisma:seed
npm run seed:demo                          # dữ liệu mẫu (dev): 9 khách nền tảng, 3 gian hàng demo-* (cà phê, spa, siêu âm 5D); -- --clean để xoá
# Prisma generate báo EPERM khi server đang chạy (khoá DLL) → dừng server rồi chạy lại
# Gọi Zalo Graph API từ máy dev lỗi chứng chỉ → chạy với NODE_OPTIONS=--use-system-ca

# Frontend
cd frontend && npm run dev | npm run build   # build = tsc -b && vite build

# VPS (AlmaLinux): cập nhật cả backend + web quản trị — xem backend/deploy/README.md
bash deploy.sh                 # --backend | --frontend | --no-pull; SKIP_BACKUP=1 bỏ sao lưu

# Mini App
cd demo-mini-app-store && npx tsc --noEmit -p . && npm run build
NODE_OPTIONS=--use-system-ca npx -y zmp-cli deploy -p -m "mô tả"      # deploy bản Development (mặc định từ 20/11/2026)
# Link Development: https://zalo.me/s/3546317553033780315/?env=DEVELOPMENT&version=zdev-<mã in ra khi deploy>
# (bản Testing cũ: thêm -t, link env=TESTING&version=<số>; quota Testing 60 lượt, Development 300)
# Mở thẳng mẫu: thêm &mode=Template&templateID=<id>
```

### Xem trước Mini App bằng Chrome headless (không cần Zalo)
Bản build dùng basename `/zapps/<APP_ID>` (ngoài Zalo là `/zapps/undefined`):
copy `www/` vào `<thư mục>/zapps/undefined/`, chạy `python -m http.server 3124` ở `<thư mục>`, rồi
`chrome --headless=new --window-size=500,1000 --screenshot=out.png "http://localhost:3124/zapps/undefined/?mode=Template&templateID=<id>&screenshot=1"`
(`screenshot=1` ẩn nút nổi "Chọn"; cửa sổ headless tối thiểu rộng 500px). Trang con (VD `/account`) cần
copy `index.html` vào `zapps/undefined/account/index.html` và đổi `./assets/` → `/zapps/undefined/assets/`.

## 8. Kiểm thử (backend)

```bash
cd backend
npm test                 # unit: nhắc lịch, SĐT, notify, chống spam — không cần server/DB
npm run start:test       # server test riêng cổng 4010, tắt rate limit (để chạy nền)
API_URL=http://localhost:4010/api npm run test:api   # tích hợp, dùng DB dev, tự dọn dữ liệu t_*
```

## 9. Quy ước code
- Giao diện & comment tiếng Việt; tên biến tiếng Anh.
- Mẫu mới: copy một mẫu có sẵn (VD `fnb_cafe_01` → `mixue_01`), đăng ký trong `src/templates/index.ts`,
  thêm ảnh `src/assets/items/<id>/`, ảnh thu nhỏ `src/assets/thumbs/<id>.jpg` + `thumbs/index.ts`,
  đồng bộ sang `frontend/src/data/site.ts` (demoTemplates), `frontend/src/assets/thumbs/` và `backend/prisma/seed.ts`.
- Sheet / Modal: import từ `@/components/back-aware` (không import thẳng từ `zmp-ui`) để vuốt back chỉ đóng sheet, không thoát trang.
- `Tile` / `ProductImage` truyền `seed={item.id}` để lấy đúng ảnh `items/<templateId>/<id>.jpg`.
- Backend: DTO dùng class-validator, PATCH dùng `PartialType(...)` (không dùng `Partial<T>` — mất validate);
  sửa/xoá bản ghi con luôn lọc theo cha (`updateMany({ where: { id, storeId } })`).
- Route cần quyền theo kênh: thêm `@RequireScopes("...")`; thao tác quản trị quan trọng gọi `AuditService.record(...)`.
- SĐT luôn chuẩn hoá bằng `normalizeVnPhone` (oauth/zalo.service.ts) trước khi lưu / so khớp với số Zalo.
- Route công khai nhận form phải gọi `AntiSpamService.enforce(...)` và có `@UseGuards(RateLimitGuard) @RateLimit(n, giây)`.
- Ảnh demo lấy từ Pexels (miễn ghi nguồn) và Wikimedia Commons (một số cần ghi nguồn CC BY-SA).
- Mixue là thương hiệu thật: mẫu T20 chỉ để chào hàng, chưa dùng logo/linh vật; cần Mixue đồng ý trước khi công khai.
