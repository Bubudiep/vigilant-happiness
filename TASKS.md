# TASKS — reMini / recloud.vn

> Cập nhật: 2026-11-19 · Bối cảnh & kiến trúc: [PROJECT.md](./PROJECT.md)
> Trạng thái: `[x]` xong · `[/]` đang làm · `[ ]` chưa làm · **(B)** = việc của chủ dự án (không code được)

Từ 20/11/2026 deploy bản **Development** (không dùng `-t`): `zmp-cli deploy -p`. Bản mới nhất: `zdev-943c98c6`
(link: `https://zalo.me/s/3546317553033780315/?env=DEVELOPMENT&version=zdev-943c98c6`).
Chưa có `VITE_API_URL` nên Mini App chưa nối backend, xem B4–B8. Bản Testing cuối cùng: v17.
Quota Zalo: Development 11/300, Testing 19/60.

---

## 0. Việc chủ dự án cần làm để chạy thật (B)

- [ ] **B1** Điền email Google của mình vào `ADMIN_EMAILS` (`backend/.env`), đăng nhập lại web quản trị
- [ ] **B2** Điền `ZALO_APP_SECRET` (mini.zalo.me → ứng dụng → Thông tin) vào `backend/.env`
- [ ] **B3** Xin quyền `scope.userInfo` + `scope.userPhonenumber` cho Mini App trên mini.zalo.me
- [ ] **B4** VPS: Node LTS, PostgreSQL, Nginx, PM2, SSL; domain `api.<domain>` → `localhost:4000`, `recloud.vn` → `frontend/dist`
- [ ] **B5** `backend/.env` production: `NODE_ENV=production`, `JWT_SECRET` mới, `PUBLIC_API_ORIGIN`, `FRONTEND_URL`, `CORS_ORIGINS`, `TRUST_PROXY=1`
- [ ] **B6** Trên VPS: `npx prisma migrate deploy && npm run prisma:seed && npm run build && pm2 start dist/main.js --name remini-api`
- [ ] **B7** Khai báo domain backend trong danh sách domain của Mini App (mini.zalo.me → Cấu hình)
- [ ] **B8** `demo-mini-app-store/.env`: `VITE_API_URL=https://api.ipays.vn/api` (đã đặt 22/11/2026, build OK) → còn deploy Mini App
- [ ] **B9** Thông tin thật trong `demo-mini-app-store/src/data/company.ts` (hotline, địa chỉ, `zaloOaId`)
- [ ] **B10** Nhập khách hàng + SĐT Zalo vào web quản trị (Dự án & Ticket) để khách đăng nhập thấy dự án
- [ ] **B12** Thông báo nhân viên: tạo Telegram bot (@BotFather), thêm vào nhóm, điền `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (hoặc `NOTIFY_WEBHOOK_URL`) vào `backend/.env`, khởi động lại backend
- [ ] **B13** Zalo OA: có OA chính thức → điền `ZALO_APP_ID`, `ZALO_APP_SECRET`, `ZALO_OA_SECRET` vào `backend/.env`; ở Zalo for Developers đặt Webhook `https://<domain>/api/oa/webhook` (bật user_send_text, user_send_image, follow); dán access/refresh token OA ở Hộp thư khách → Kết nối OA. Cần backend https công khai (B4–B8)
- [ ] **B11** Xin phép Mixue trước khi công khai mẫu T20 (hoặc đổi tên thương hiệu giả lập)

---

## 1. Đã hoàn thành

### Mini App (`demo-mini-app-store`)
- [x] 24 mẫu demo theo ngành (T01–T24), mẫu T20 Mixue (kem & trà sữa); T21 Tiệm cắt tóc `cat_toc_01`, T22 Nail `nail_01`, T23 Spa dưỡng sinh & liệu trình `spa_02`, T24 Tiệm net `tiem_net_01` (23/11/2026)
- [x] Ảnh sản phẩm/banner đúng từng món (`src/assets/items/<templateId>/`), ảnh thu nhỏ mockup iPhone (`src/assets/thumbs/*.jpg`)
- [x] Bảng chia sẻ (`components/share/share-sheet.tsx`): thẻ xem trước, gửi qua Zalo (`openShareSheet` zmp_deep_link có thumbnail), sao chép link
- [x] Nút chia sẻ ở thẻ mẫu + đầu trang chủ; ảnh bìa chia sẻ `src/assets/share-cover.jpg`
- [x] Module "Mời bạn bè" (`_shared/kit/referral.tsx`) ở trang Tài khoản của 18 mẫu, ưu đãi theo ngành (tắt ở KCN, trường học)
- [x] Form tư vấn (`components/showcase/consultation-form.tsx`): đăng nhập Zalo tự điền tên + SĐT, tab **Đặt lịch gọi lại** (ngày + khung giờ), honeypot + form token
- [x] Tab **Tài khoản** (`pages/account.tsx`): Mini App đã đăng, tiến độ dự án + mốc, ticket (tạo / trả lời / đóng)
- [x] Session Zalo + refresh token tự động (`utils/auth.ts`)

### Backend
- [x] Vá bảo mật: mọi API quản trị cần xác thực; chủ shop chỉ thấy store của mình; chặn sửa chéo product/customer
- [x] JWT secret bắt buộc (dev tự sinh), chặn open redirect, upload chỉ nhận ảnh thật (kiểm tra magic bytes)
- [x] OAuth 2.0 kiểu django-oauth-toolkit (`src/oauth/`): kênh có client_id/secret, token/revoke/introspect, rotation + phát hiện dùng lại refresh token
- [x] Grant `zalo_mini_app`: lấy hồ sơ + SĐT Zalo bằng phone token (`src/oauth/zalo.service.ts`)
- [x] CORS chấp nhận domain Zalo (`*.zdn.vn`, `*.zadn.vn`, `*.zalo.me`, `*.zaloapp.com`, `*.zalo.vn`)
- [x] Lead đặt lịch gọi lại (`callbackDate`, `callbackSlot`), gắn tài khoản Zalo, `phoneVerified`, ghi chú cuộc gọi
- [x] Cổng khách hàng `/api/me/*`, quản trị `/api/admin/projects|milestones|tickets` (`src/portal/`)
- [x] Bộ chống spam (`src/antispam/`) + rate limit (`common/guards/rate-limit.guard.ts`)
- [x] Bổ sung migration còn thiếu; migration mới: `oauth_and_callback_leads`, `projects_tickets_antispam`

### Web quản trị (`frontend`)
- [x] Bỏ đăng nhập giả qua tham số URL; đăng nhập Zalo giả lập chỉ còn ở dev
- [x] Lưu thiết kế (`builderSchema`) + tạo store lên máy chủ, gửi kèm JWT
- [x] Thay ảnh kho của trình thiết kế bằng ảnh đúng sản phẩm; ảnh thu nhỏ mới; thêm mẫu Mixue
- [x] Mục **Lịch gọi lại**, **Dự án & Ticket**, **Chống spam**, **Kết nối API** (sidebar `StoreConsole.tsx`)

---

## 2. Việc tiếp theo (theo thứ tự ưu tiên)

Mỗi việc ghi rõ file liên quan và tiêu chí xong. Sau mỗi việc: typecheck cả 3 project
(`npx tsc --noEmit -p .` ở backend & mini app, `npx tsc --noEmit` ở frontend) và build.

### [x] T1. Thông báo cho nhân viên khi có lead / lịch gọi lại / ticket mới
- **Đã làm:** `backend/src/notify/` (Telegram + webhook chung, bật bằng `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`/`NOTIFY_WEBHOOK_URL`); gọi từ `LeadsController.create` (bỏ qua nghi spam, bỏ qua lead trùng) và `PortalService` (ticket mới, khách trả lời). Có test. **Chưa thử gửi Telegram thật** (cần bạn tạo bot, điền env — B12).
- **Mục tiêu:** nhân viên biết ngay, không phải mở trang quản trị liên tục.
- **Làm:** module `backend/src/notify/` với `NotifyService.send(event, payload)`; kênh đầu tiên **Telegram Bot**
  (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) vì dễ nhất; sau đó Zalo OA / email.
  Gọi từ `LeadsService.create` (bỏ qua nếu `spamScore >= 40`), `PortalService.createTicket`, `customerReply`.
  Không chặn request nếu gửi lỗi (bắt lỗi, log).
- **Xong khi:** tạo lead/ticket thử → nhận tin nhắn có tên, SĐT, giờ hẹn, link trang quản trị.

### [x] T2. Nhắc lịch gọi lại
- **Đã làm:** `backend/src/jobs/jobs.service.ts` — mỗi phút nhắc lịch `NEW` trong 15 phút trước giờ hẹn đến hết khung; đánh dấu `remindedAt` có điều kiện (an toàn khi chạy nhiều instance). Đã thử thật: chỉ lịch đủ điều kiện được đánh dấu.
- **Làm:** job chạy mỗi 5 phút (`@nestjs/schedule`) tìm lead `requestType=callback`, `status=NEW`,
  khung giờ bắt đầu trong 15 phút tới → gửi qua `NotifyService`; đánh dấu đã nhắc (thêm cột `remindedAt`).
- **Xong khi:** không nhắc trùng; lead đã `CONTACTED` không bị nhắc.

### T3. Báo cho khách khi ticket được trả lời / dự án đổi trạng thái
- **Làm:** gửi tin Zalo OA (cần OA + user đã quan tâm OA, `User.providerId` là Zalo user id theo app — kiểm tra
  có map sang OA user id không) hoặc ZNS (cần template được duyệt). Gọi trong `PortalService.staffReply`,
  `updateProject` khi `status` đổi. Có cờ tắt bật qua env.
- **Xong khi:** khách nhận tin có tiêu đề ticket / trạng thái mới và mở được Mini App vào đúng tab Tài khoản.

### T4. Đính kèm ảnh vào ticket
- **Làm:** bảng `TicketAttachment` (ticketId, messageId, url, mimeType, size) hoặc trường JSON trong `TicketMessage`;
  endpoint `POST /me/tickets/:id/attachments` dùng lại kiểm tra magic bytes của `MediaService`
  (giới hạn 5 MB, tối đa 5 ảnh/tin); Mini App dùng `chooseImage` của zmp-sdk; admin hiển thị ảnh trong Drawer ticket.
- **Xong khi:** chỉ khách sở hữu ticket và admin xem được ảnh (đặt link có chữ ký hoặc route có kiểm tra quyền, không để public trong `/uploads`).

### [x] T5. Bắt buộc scope theo route khi gọi bằng token của kênh
- **Đã làm:** `@RequireScopes(...)` trong `app-auth.guard.ts` (chỉ áp cho token OAuth). Stores: `stores:read` / `stores:write`; media: `stores:write`; `/me/*`: `profile`, tạo/trả lời/đóng ticket: `tickets:write`. Seed cấp `profile leads:write tickets:write` cho kênh Mini App. Admin Google/x-admin-key không bị ràng buộc.
- **Hiện trạng:** `AppAuthGuard` gắn `auth.scopes` nhưng chưa route nào kiểm tra.
- **Làm:** decorator `@RequireScopes("stores:write")` + kiểm tra trong guard **chỉ khi** `auth.clientId` có giá trị
  (token OAuth). Danh sách scope: `profile`, `stores:read`, `stores:write`, `orders:write`, `leads:write`, `tickets:write`.
- **Xong khi:** token `client_credentials` chỉ có `stores:read` gọi `PATCH /stores/:id/config` → 403.

### T6. Chuyển rate limit + nonce form token sang Redis
- **Hiện trạng:** lưu RAM (`RateLimitGuard.hits`, `AntiSpamService.usedNonces`) → mất khi restart, không dùng chung khi chạy nhiều instance.
- **Làm:** `REDIS_URL` tuỳ chọn; có thì dùng Redis (`INCR` + `EXPIRE`, `SET NX EX`), không có thì giữ RAM.

### [x] T7. Job dọn dữ liệu
- **Đã làm:** cron 3:15 sáng (giờ VN) trong `jobs.service.ts`: token hết hạn/thu hồi > 30 ngày, `SpamEvent` > 90 ngày, `SpamBlock` hết hạn > 30 ngày.
- Xoá `OAuthAccessToken`/`OAuthRefreshToken` hết hạn hoặc thu hồi > 30 ngày; `SpamEvent` > 90 ngày; `SpamBlock` hết hạn > 30 ngày.

### [x] T8. Nhật ký thao tác quản trị (audit log)
- **Đã làm:** bảng `AuditLog`, `AuditService.record(req, action, target, meta)` (tự ẩn trường có `secret|token|password|key`), `GET /api/admin/audit`, trang "Nhật ký thao tác" trong web quản trị. Đã gắn: kênh OAuth (tạo/sửa/tắt/đổi secret/thu hồi/xoá), sửa store, chặn/bỏ chặn spam, dự án, ticket. **Chưa gắn:** CRUD khách hàng/nhân sự, gói cước, sản phẩm/khách của store.
- Bảng `AuditLog` (actorId, action, targetType, targetId, meta JSON, ip, createdAt). Ghi khi: tạo/xoá kênh OAuth,
  đổi secret, thu hồi token, sửa store, chặn/bỏ chặn spam, đổi trạng thái dự án/ticket. Trang xem trong web quản trị.

### T9. Gom dữ liệu trùng giữa frontend và Mini App
- **Hiện trạng:** danh sách mẫu (`frontend/src/data/site.ts` ↔ `demo-mini-app-store/src/templates/*/index.ts` ↔
  `backend/prisma/seed.ts`), ảnh thu nhỏ, ảnh kho đang copy tay.
- **Làm:** một nguồn duy nhất (VD `backend` phục vụ `GET /api/templates` + ảnh tĩnh, hoặc thư mục `shared/` + script sync).

### [x] T10. Kiểm thử tự động (backend)
- **Đã làm:** `backend/test/unit.test.ts` (12 test: nhắc lịch, SĐT, notify, chống spam) → `npm test`; `backend/test/api.test.ts` (16 test tích hợp: phân quyền, cách ly dữ liệu khách, OAuth + rotation, lead/spam, lịch gọi lại) → chạy `npm run start:test` (cổng 4010, tắt rate limit) rồi `API_URL=http://localhost:4010/api npm run test:api`. Test tự dọn dữ liệu (tiền tố `t_`, SĐT `0966…`).
- e2e (Jest + supertest, DB test riêng): `/oauth/token` (sai secret, scope, rotation, reuse), phân quyền store
  (chủ shop A không đọc được store B), `/leads` (honeypot, từ khoá, trùng 10 phút), `/me/*` (không xem ticket khách khác).

### [x] T15. Hộp thư chăm sóc khách + ảnh khách + OA + nhắc chăm sóc
- **Đã làm (backend `src/inbox/`):** bảng `Conversation`, `Message`, `Attachment`, `CareTask`, `OaCredential` (migration `20261120130000_inbox_oa_care`). Kênh `miniapp` (khách nhắn trong tab Tài khoản) và `oa` (webhook `POST /api/oa/webhook`, kiểm tra chữ ký `X-ZEvent-Signature`, chống xử lý trùng theo `msg_id`). Nhân viên trả lời từ web (`/api/inbox/conversations/:id/messages`), có ghi chú nội bộ; gửi OA lỗi vẫn lưu tin với `delivery=failed` + lý do. Ảnh lưu **riêng tư** ở `backend/uploads-private/` (không phục vụ tĩnh), tải qua URL ký HMAC có hạn `/api/files/:id?exp&sig`; kiểm tra ảnh theo nội dung (không tin đuôi/MIME), tối đa 8MB, 30 ảnh/ngày/hội thoại. Gắn khách hàng cho hội thoại → ảnh thuộc khách đó. Việc chăm sóc (`CareTask`) có cron mỗi phút nhắc qua Telegram/webhook khi đến hạn. Token OA lưu DB, tự làm mới (`oa.service.ts`).
- **Đã làm (web quản trị):** 3 mục mới — **Hộp thư khách** (danh sách, chat, gửi ảnh, ghi chú nội bộ, gắn khách, hẹn chăm sóc, khung kết nối OA), **Ảnh khách hàng** (lưới ảnh, lọc theo khách/nguồn/thẻ, thẻ + ghi chú, tải lên, xoá), **Chăm sóc khách** (việc hẹn, hoàn thành). Badge số tin chưa đọc / việc đến hạn (cập nhật 30s).
- **Đã làm (Mini App):** nút "Nhắn tin với reMini" ở tab Tài khoản (cả khách chưa có hợp đồng), gửi chữ + ảnh (thu nhỏ ≤1600px), hỏi tin mới mỗi 6s khi mở, chấm đỏ tab Tài khoản gồm tin chưa đọc.
- **Test:** unit (chữ ký, nhận diện ảnh, tên file), API (nhắn, ảnh, URL ký giả/hết hạn, file giả mạo, phân quyền, webhook OA ký đúng/sai/lặp, chăm sóc).
- **Chưa thử thật / còn lại:** (1) gửi + nhận qua Zalo OA thật (cần B13), (2) chọn ảnh bằng `<input type=file>` trong WebView Zalo trên điện thoại thật, (3) thông báo "khách có tin mới" qua Zalo ZNS cho khách khi nhân viên trả lời (T3), (4) polling 6s → nên đổi WebSocket/SSE khi đông khách, (5) tự gắn hội thoại OA với khách theo SĐT khi khách chia sẻ số, (6) dọn ảnh/hội thoại cũ theo chính sách lưu trữ.

### [x] T14. Khách nợ tiền (công nợ)
- **Đã làm:** bảng `Debt` + `DebtPayment` (migration `20261120110000_debts`), module `backend/src/debts/` (`/api/debts`, chỉ admin, ghi audit `debt.*`), trang **Khách nợ tiền** trong web quản trị (`frontend/src/components/DebtViews.tsx`): thẻ tổng hợp (tổng nợ, quá hạn, số khách nợ, đã thu), lọc trạng thái, thêm/sửa/xoá khoản nợ, thu từng phần (không cho thu vượt, kiểm tra trong transaction Serializable), huỷ lần thu, xuất CSV. Trạng thái `unpaid/partial/paid/overdue` tính khi đọc. Có test (unit + API).
- **Chưa làm:** nhắc nợ tự động qua Telegram/Zalo (cần T3), cho khách xem công nợ trong tab Tài khoản của Mini App, nhập khoản nợ từ gói cước/hợp đồng.

### [x] T16. Người bán phải được kích hoạt + bỏ dữ liệu demo (22/11/2026)
- Đăng ký người bán → chờ kích hoạt → admin kích hoạt (trang Khách hàng reMini, lọc "Chờ kích hoạt") → tạo store.
- Bỏ `initialStores`/localStorage và mọi dữ liệu mẫu (`DEFAULT_*`) — store, sản phẩm, khách hàng đọc/ghi thẳng API.
- Chọn store mới (`StoreSwitcher`), trình tạo store 2 bước (`CreateStoreWizard`), menu quản trị nền tảng ẩn với chủ shop.
- Lịch hẹn, Sự kiện, Đơn hàng, Kho, Hạng & Voucher, Tài liệu đã lưu DB theo từng store (T17). **Còn lại:** mục "Hỗ trợ" trong store vẫn chỉ giữ trong phiên.

### [x] T17. Tài khoản quản trị + tài khoản khách theo từng gian hàng (22/11/2026)
- Trang **Tài khoản quản trị**: đánh dấu / gỡ quản trị nền tảng (`User.role`).
- Khách của store đăng nhập Zalo (`/api/shop/:slug/*`): hồ sơ, điểm, hạng, voucher, đặt hàng, đặt lịch — dữ liệu riêng từng store.
- Migration `20261122100000_store_customer_accounts` (StoreCustomer: avatarUrl, address, lastLoginAt, unique storeId+zaloUserId; Store.zaloAppSecretEnc).
- **Còn lại:** Mini App của store chưa gọi các API `/shop/*` (cần giao diện đăng nhập / giỏ hàng / đặt lịch trong Mini App runtime); áp voucher khi đặt hàng.

### [x] T18. Gom trang Khách hàng + Lịch nhóm (22/11/2026)
- `/admin/customers` có tab: Tệp khách hàng · Tin nhắn · Album ảnh khách · Chăm sóc (3 tab sau chỉ quản trị viên). Link cũ `/admin/inbox|files|care` tự chuyển sang tab.
- Lịch hẹn: giao diện **Lịch nhóm** (hàng = nhân viên, cột = hôm qua → +5 ngày), bấm lịch để đổi trạng thái / người phụ trách / xoá, bấm ô trống để đặt lịch điền sẵn ngày + nhân viên; tab "Danh sách" giữ bảng cũ.

### [x] T19. Album ảnh khách theo từng gian hàng (22/11/2026)
- Mục **Album ảnh** của store: Album hôm nay / Ảnh cưới / Ảnh đám hỏi / Khác, ảnh xem trước (tự thu nhỏ ≤2048px, URL ký 2h) + link ảnh gốc (Drive, Google Photos, Dropbox…), ảnh bìa, ghi chú.
- **Gửi cho khách** → tin nhắn vào hộp thư store ↔ khách (`StoreMessage`), khách có chấm đỏ tới khi mở xem; chủ shop thấy "Khách đã xem". Thu hồi album.
- API khách: `/api/shop/:slug/me/albums`, `/me/albums/:id`, `/me/messages`, `/me/unread`. Migration `20261122120000_store_albums`.
- Nginx `api.<domain>`: `client_max_body_size 50m` (tải 8 ảnh / request).
- **Còn lại:** Mini App của store chưa có màn hình Album / Tin nhắn; báo qua Zalo OA / ZNS của store.

### [x] T20. Hồ sơ khách + nhắn tin + tự lưu (22/11/2026)
- Bấm một khách ở Khách hàng → hồ sơ: hạng/điểm/chi tiêu, liên hệ, tài khoản Mini App, lịch sắp tới; tab Nhắn tin · Đơn hàng · Lịch hẹn · Album.
- Nút **Nhắn tin** từng khách (badge tin chưa đọc; mục Khách hàng đỏ khi có tin mới) — tin vào hộp thư khách trong Mini App của quán (`StoreMessage`).
- Bỏ nút "Lưu cấu hình": thông tin store & thiết kế **tự lưu** sau 1,2s (chỉ báo "Đang lưu… / Đã lưu"); App Secret lưu khi rời ô nhập.

### [x] T21. Rà soát & tối ưu trang quản trị (22/11/2026)
- Danh sách store chỉ tải tóm tắt (`GET /stores` không kèm thiết kế); chi tiết tải khi chọn store — trước đây tải chi tiết MỌI store lúc mở trang.
- Ghi dữ liệu theo id store (không ghi nhầm sang store khác khi đổi store lúc đang chờ máy chủ); đọc state mới nhất qua ref.
- Đồng bộ Lịch hẹn/Sự kiện/… chạy theo hàng đợi + ánh xạ id tạm → id thật (tạo rồi sửa ngay không còn 404); tự lưu cấu hình cũng chạy lần lượt.
- Tự lưu chỉ so sánh sau khi đã tải chi tiết (tránh ghi đè slider/thiết kế bằng bản tóm tắt).
- Phiên hết hạn (401) → tự đăng xuất về trang đăng nhập.
- Tách code: trang quản trị, trình thiết kế, album, các mục quản trị nền tảng tải riêng (trang chủ không tải code quản trị).
- Ngừng hỏi tin mới khi tab ẩn; Drawer dùng `size` (antd v6).

### [x] T22. Tách trang điều hành `/controller` (22/11/2026)
- `/admin/*` = quản trị cửa hàng (chủ shop; quản trị viên xem mọi shop, có nút "Điều hành").
- `/controller/*` = trang điều hành nền tảng, chỉ quản trị viên: Khách hàng reMini, Tin nhắn, Album ảnh khách, Chăm sóc, Lịch gọi lại, Dự án & Ticket, Khách nợ tiền, Tài khoản quản trị, Chống spam, Kết nối API, Nhật ký.
- Sau đăng nhập vào `/admin`: quản trị viên → `/controller`, chủ shop → `/admin/overview`. Link cũ (`/admin/inbox`, `/admin/customers?tab=care`…) tự chuyển.

### [x] T23. Tạo đơn tại quầy + mã voucher in thẻ (22/11/2026)
- Migration `20261122150000_orders_voucher_codes`: `StoreOrder` thêm `subtotal`, `shippingFee`, `discountAmount`, `voucherCode`, `source`; model mới `StoreVoucherCode` (mã dùng 1 lần).
- `POST /stores/:id/data/orders`: chủ shop tạo đơn (sản phẩm có sẵn / dòng tự nhập, sửa đơn giá, phí ship, giảm thêm, mã voucher); tự tạo khách theo SĐT; đơn "Hoàn thành" cộng điểm ngay. `POST .../orders/preview-voucher` kiểm tra mã.
- Áp voucher dùng chung `stores/voucher-redeem.ts` (cả đơn Mini App `/shop/:slug/me/orders` nhận `voucherCode`): kiểm tra hạn, bật/tắt, đơn tối thiểu, hạng, số lượt; huỷ đơn trả lượt, mở lại đơn giữ lại mã.
- Mã thẻ: `GET/POST /stores/:id/data/vouchers/:vid/codes` (sinh tối đa 5.000 / lần, bỏ ký tự dễ nhầm), `POST .../codes/delete` (chỉ xoá mã chưa dùng).
- Web: `StoreOrderViews.tsx` (lọc theo trạng thái, tìm, xem chi tiết đơn, ngăn "Tạo đơn"); `VoucherCards.tsx` (quản lý mã, xuất Excel bằng `write-excel-file`, in thẻ 5 mẫu × 6 cỡ + tuỳ chỉnh, giấy A4 / A3 / máy in thẻ, QR bằng `qrcode`).
- **Còn lại:** Mini App của store chưa có ô nhập voucher ở giỏ hàng; tạo đơn chưa trừ tồn kho.

### [x] T24. Tệp khách hàng: xem nhanh + thao tác ngay tại chỗ (22/11/2026)
- `/admin/customers` (`StoreCustomerViews.tsx` `CustomersSection`): bảng xem nhanh (hạng, chi tiêu, lịch hẹn tới, tin nhắn cuối + chưa đọc) với nút **Đặt lịch**, **Nhắn tin** (modal chat), **Gửi ảnh**.
- Kéo thả 1 / nhiều ảnh hoặc link (Drive, Google Photos…) vào dòng khách → modal đặt tên → tạo album + gửi tin báo khách. Bấm dòng mở hồ sơ (drawer), album mở ngay tại chỗ (`AlbumDrawer`), không chuyển trang.
- API mới `GET /stores/:id/messages/conversations` (tin cuối + số chưa đọc theo từng khách).

### [x] T25. Shop tự tạo loại album (22/11/2026)
- `Store.albumKinds` (Json, null = mặc định Hôm nay / Ảnh cưới / Đám hỏi / Khác), migration `20261122180000_store_album_kinds`.
- API `GET|PUT /stores/:id/album-kinds` — `{ kinds: [{ key?, label, color, icon, hint? }] }`, tối đa 20, key bỏ trống = loại mới (`k_xxxxxx`); album thuộc loại bị xoá chuyển sang "Khác" (hoặc loại cuối). Tạo/sửa album kiểm tra `kind` theo danh sách của shop.
- Frontend: `AlbumKindsModal` (tên, mô tả, 17 biểu tượng, màu, sắp xếp, xoá) + hook `useAlbumKinds` dùng chung; mở từ nút "Loại album" / "+ Thêm loại" ở mục Album ảnh, ô "Thêm / sửa loại" khi tạo album, nút "+" cạnh chọn loại trong modal Gửi ảnh. Đổi loại album trong `AlbumDrawer`.

### [x] T29. Mẫu Tiệm cắt tóc, Nail, Spa liệu trình, Tiệm net (23/11/2026)
- Mini App: `src/templates/{cat_toc_01,nail_01,spa_02,tiem_net_01}` — barber (hàng chờ trực tiếp + lấy số, chọn thợ, kiểu tóc), nail (chọn mẫu & màu sơn), spa (gói liệu trình nhiều buổi, trừ buổi khi đặt, chọn phòng), net (sơ đồ máy theo khu, đặt máy theo giờ, đếm ngược giờ chơi, nạp ví, gọi đồ tới máy).
  Ảnh Pexels ở `src/assets/items/<id>/`, ảnh thu nhỏ mockup `src/assets/thumbs/<id>.jpg`; thêm map icon emoji / `zi-list-1`, `zi-grid-solid` (trước hiện ngôi sao).
- Frontend: `site.ts` (demoTemplates), `assets/thumbs`, preset Miniapp Studio `barber`, `nail`, `netcafe` (ảnh `public/stock/{barber,nail,netcafe}`), `guessPresetId`; số mẫu 19 → 24 trên trang chủ. Backend `prisma/seed.ts` (24 mẫu).

### [x] T28. Trang điều hành: cấu hình app khách, gói dịch vụ, voucher gói (23/11/2026)
- **Cấu hình app khách** (`/controller/apps`, `CustomerAppsViews.tsx`): mọi store kèm chủ, gói (hạn còn lại), App ID / OA, số sản phẩm / khách; lọc (App riêng, chưa gắn gói, sắp hết hạn, đang tắt); bật/tắt app; QR xem trước;
  drawer sửa thông tin, mẫu, Zalo App ID / App Secret / OA, **đổi chủ & gắn gói** (`PATCH /stores/:id/config` nhận `customerId`, `subscriptionId` — chỉ admin, gói phải thuộc chủ store); "Mở trang quản trị / Miniapp Studio của khách" để làm hộ.
- **Gói dịch vụ** (`/controller/plans`, `PlatformBillingViews.tsx`): danh mục gói (thêm / sửa / tắt / xoá nếu chưa có khách — `DELETE /subscriptions/plans/:id`), gói khách đang dùng (đăng ký cho khách + voucher, gia hạn +1 tháng / +1 năm, đổi trạng thái, sửa).
- **Voucher gói** (`/controller/vouchers`): model `PlatformVoucher` (migration `20261123090000_platform_vouchers`), `GET|POST /subscriptions/vouchers`, `PATCH|DELETE /subscriptions/vouchers/:id`, `POST /subscriptions/vouchers/preview`;
  giảm % (trần) hoặc số tiền, giá tối thiểu, giới hạn gói / chu kỳ, số lượt (giữ lượt có điều kiện), thời gian. `Subscription.voucherCode` + `discountAmount`. Test `test/billing.api.test.ts` (3).
- Miniapp Studio: bỏ đổi lề riêng khi vào tab Miniapp (gây nhảy giao diện), khung thiết kế vừa khít màn hình (`calc(100vh - 150px)`).

### [/] T27. Quét QR mở đúng Mini App của gian hàng (xem trước) (22/11/2026)
- QR ở trang quản trị (Thông tin store + Miniapp Studio) dùng `getZaloStoreUrl(slug)` → `zalo.me/s/<appId reMini>/?env&version&store=<slug>` (trước là `mode=Template&templateID=…` nên chỉ ra mẫu minh hoạ).
- Mini App: `?store=<slug>` → route `/store/:slug` (`src/store-runtime/store-app.tsx`) đọc `GET /stores/public/:slug` và render đúng thiết kế Miniapp Studio (`builderSchema`): thanh tiêu đề, khối, tab bar, popup hội viên (giả lập). Store chưa có thiết kế → mở mẫu `templateId`.
  Bộ render chép từ `frontend/src/miniapp-builder/{blocks,icons,types}` bằng `node scripts/sync-builder.mjs` (chạy lại khi sửa bên frontend).
- Ảnh mẫu của builder chuyển sang `frontend/public/stock/<ngành>/…` (URL cố định); `/stores/public/:slug` đổi URL ảnh tương đối thành `FRONTEND_URL/…` (kèm `assetBase`), trả thêm voucher đang chạy + tài liệu đã đăng. Thiết kế cũ `/src/assets/templates/…` tự đổi sang `/stock/…`.
- **Còn lại:** deploy Mini App bản mới + cập nhật `VITE_ZALO_VERSION`; `FRONTEND_URL` trên VPS phải là domain https của web; nối dữ liệu thật (đăng nhập, giỏ hàng, đặt lịch, album) — bước 3; App ID riêng của shop chưa dùng link này.

### [x] T26. Thiết lập gian hàng: App ID riêng, OA riêng, yêu cầu build app (22/11/2026)
- **Đã làm:** trang chủ shop **Thiết lập** (`/admin/settings`: Mini App ID + App Secret, OA ID/OA Secret/token/URL webhook); form **yêu cầu build** + tiến trình nằm trong cửa sổ **Xuất bản** (Miniapp → Xuất bản) và **Tin nhắn OA** (`/admin/oainbox`, dùng lại `InboxSection` với `storeId`);
  trang điều hành **Yêu cầu build app** (`/controller/builds`: Duyệt → Đã phát hành / Từ chối + lý do). Backend `src/builds/`, `src/inbox/store-oa.service.ts`, migration `20261122200000_store_oa_build_requests`.
  Thông báo Telegram/webhook `build.requested`. Test: `test/store-oa.api.test.ts` (6) — API 29/29, unit 16/16. Test bắt được lỗi lộ `oaSecretEnc` ở chi tiết store → đã vá.
- **Chưa thử thật / còn lại:** OA thật của gian hàng (cần OA + https + B13); shop chưa được báo khi trạng thái build đổi (chỉ thấy khi mở trang); build/deploy vẫn do reMini làm tay từ `snapshot`
  (chưa tự `zmp-cli deploy`); tin OA của gian hàng chưa có thông báo cho chủ shop; chưa xem giao diện bằng trình duyệt.

### [/] T11. Trang quản trị: hoàn thiện
- **Đã làm:** xuất CSV (Lịch gọi lại / Nhận tư vấn); trang **Khách hàng reMini** (CRUD + SĐT nhân sự, SĐT tự chuẩn hoá về `0xxxxxxxxx` để khớp số Zalo). **Còn lại:** gán `storeId` cho dự án, sửa ngày bắt đầu/hạn dự án trong giao diện.
- Lead tab "Nhận tư vấn" + "Đặt lịch" thêm xuất Excel/CSV.
- Dự án: gán `storeId` để khách thấy Mini App tương ứng; sửa ngày bắt đầu/hạn.
- Khách hàng nền tảng: trang danh sách/sửa `PlatformCustomer` + `CustomerStaff` (SĐT Zalo của nhân sự khách).

### [/] T12. Mini App: hoàn thiện nhỏ
- **Đã làm:** chấm đỏ số ticket "Chờ bạn phản hồi" trên tab Tài khoản (`pendingTicketsAtom`). **Còn lại:** kéo để làm mới, hướng dẫn khi từ chối quyền SĐT, kiểm tra trên điện thoại thật (B3 trước).
- Tab Tài khoản: kéo để làm mới; huy hiệu số ticket "Chờ bạn phản hồi" trên thanh tab.
- Thông báo rõ khi `authorize` bị từ chối quyền SĐT (hướng dẫn mở lại quyền trong cài đặt Zalo).
- Kiểm tra trên **điện thoại thật**: đăng nhập Zalo, lấy SĐT, chia sẻ thẻ Mini App, link `mode=Template`.

### T13. Giao diện / nội dung
- Ảnh từ Wikimedia Commons có giấy phép CC BY-SA → thay bằng ảnh Pexels hoặc thêm trang ghi nguồn.
- Mẫu T20: thay logo/màu chính thức nếu Mixue đồng ý.

---

## 3. Lưu ý kỹ thuật đã biết

- `prisma generate` lỗi `EPERM ... query_engine-windows.dll.node` khi backend đang chạy → dừng server rồi chạy lại.
- Máy dev có proxy công ty: dùng `NODE_OPTIONS=--use-system-ca` cho `zmp-cli deploy` và khi backend gọi Zalo Graph API.
- `zmp-cli deploy -e` (deploy thư mục có sẵn) lỗi "No asset defined" → dùng `deploy -p -t` (CLI tự build).
- Chrome headless cửa sổ tối thiểu rộng 500px; bản build cần phục vụ dưới `/zapps/undefined/` (xem PROJECT.md §7).
- `prisma generate` lỗi EPERM khi backend dev đang chạy: type vẫn được cập nhật nên `tsc` chạy được; muốn cập nhật cả engine thì dừng server (`nest start --watch`) rồi chạy lại.
- Deploy Development in ra version dạng `zdev-xxxxxxxx` (không phải số); link xem thử dùng `env=DEVELOPMENT`.
- `trust proxy` chỉ bật khi có `TRUST_PROXY` — không bật khi không có Nginx phía trước (client giả IP được).
- Ảnh album được nén khi tải lên (`sharp`, `album-storage.service.ts`): ≤ 2048px, WebP q80 + thumbnail 400px ở `uploads-private/albums/thumbs/` (xem qua `?t=1`). Ảnh album cũ chưa nén/chưa có thumbnail vẫn xem bình thường. `sharp` phải ghim `0.34.x` (0.35 lệch type với `module: commonjs`). Trên AlmaLinux (glibc) `npm ci` tự tải binary dựng sẵn, không cần cài thêm gì.
- Trang `/controller`: bỏ mục "Album ảnh khách"; "Chăm sóc" gộp vào "Tin nhắn" (tab `?tab=care`); thêm mục "Dung lượng" (`/controller/storage`, API `GET /api/admin/storage`: ổ đĩa server, DB, ảnh theo từng gian hàng + tổng). `customer-app/` chứa Mini App riêng của từng khách.
