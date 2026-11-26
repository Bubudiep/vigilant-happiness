# TASKS — reMini / recloud.vn

> Cập nhật: 2026-11-25 · Bối cảnh & kiến trúc: [PROJECT.md](./PROJECT.md)
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
- [ ] **B6** Trên VPS: `npx prisma migrate deploy && npm run prisma:seed && npm run build && pm2 start dist/src/main.js --name remini-api` (nest build ra `dist/src/main.js`; T33 có `ecosystem.config.js`)
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

### Đợt giao 25/11/2026 — điều phối bởi phiên `demo-f7` (đã xong, commit ở nhánh `feat/storage-quota-media`)
| Việc | Phiên | Trạng thái |
|---|---|---|
| T31 Hạn mức dung lượng theo gói (backend) | `backend-d2` | [x] test API 39/39 |
| DTO dự án nhận `null` (T11) | `backend-d2` | [x] |
| T32 Cảnh báo ổ đầy + dọn file mồ côi + nén lại ảnh cũ + chuyển ảnh base64 | `backend-d2` | [x] API 42/42, unit 19/19 |
| T33 Bộ triển khai AlmaLinux (`deploy/`) + sao lưu | `backend-d2` | [x] chưa thử trên VPS thật |
| T39 Xoá file ảnh khi xoá gian hàng | `backend-d2` | [x] API 45/45 |
| T8 Gắn audit log còn thiếu + xoá logo cũ | `backend-d2` | [x] API 49/49 |
| T34 Giao diện hạn mức dung lượng | `frontend-2b` | [x] (chờ API T31 để thử thật) |
| T11 còn lại: gán store + sửa ngày dự án | `frontend-2b` | [x] |
| T34b Album: xử lý `quotaExceeded` (lưu một phần) | `frontend-2b` | [x] |
| T37 Giảm bundle trang chủ (861KB) | `frontend-2b` | [x] 861 → 719KB |
| T38 Dọn code chết sau khi bỏ "Album ảnh khách" | `frontend-2b` | [x] |
| T40 Test tự động cho frontend (vitest) | `frontend-2b` | [x] 28/28 |
| T41 Album: chia lô tải ≤ 45MB + lỗi 413 của Nginx | `frontend-2b` | [x] test 37/37 |
| T42 Mini App gian hàng: đăng nhập Zalo + Album + Tin nhắn | `frontend-2b` | [x] chưa thử trong Zalo |
| T43 Thư viện ảnh của gian hàng (xem / xoá media) | `frontend-2b` | [x] test 41/41 |
| T44 API media trả cờ `inUse` (gồm logo / cover / banner) | `backend-d2` | [x] API 51/51 |
| T44c Xoá ảnh đang dùng → 409 (`?force=1` để ép) | `backend-d2` | [x] API 52/52 |
| T46 Nút "Xoá gian hàng" (trang Cấu hình app khách) | `frontend-2b` | [x] test 60/60 |
| T47 Chuẩn hoá giao diện quản trị (font, cỡ chữ, bố cục bộ lọc / form) | `frontend-2b` | [x] chưa xem bằng trình duyệt |
| T47b Hoàn thiện T47: StatCard, form 2 cột, tabular-nums, chip lọc, thang chữ gọn | `frontend-2b` + `demo-f7` | [x] |
| T48 Sửa UI theo ảnh chụp (Chrome headless) | `demo-88` | [x] |
| T49 Dữ liệu mẫu `npm run seed:demo` (3 gian hàng: cà phê, spa, siêu âm 5D) | `demo-88` | [x] |
| T50 Mặt hàng loại Dịch vụ (`StoreProduct.kind`, `durationMin`, không tồn kho); gộp trang Kho vào Sản phẩm (sửa tồn kho ngay trên bảng) | `demo-88` | [x] |
| T51 Nhân sự gian hàng (`StoreStaff`, collection `data/staff`): hồ sơ, ca làm, dịch vụ đảm nhận, lương; gợi ý phân công lịch hẹn | `demo-88` | [x] |
| T52 Chấm công (`StoreAttendance`, `/stores/:id/attendance`): bảng tuần, chấm vào/ra, tự tính đi muộn, tự cập nhật trạng thái nhân viên theo chấm công hôm nay | `demo-88` | [x] |
| T52b Kết nối máy chấm công: endpoint nhận lượt quẹt → `AttendanceService.punch()` theo `StoreStaff.attendanceCode` | — | [ ] chờ chọn loại máy (ZKTeco push / SDK…) |
| T53 Tổng quan: bảng lịch hẹn Hôm qua / Hôm nay / Ngày mai + thẻ gói đang dùng & hạn mức (`GET /stores/:id/plan`) | `demo-88` | [x] |
| T54 Khung chat mở cạnh hồ sơ khách (màn ≥ lg) | `demo-88` | [x] |
| T56 Kéo thả lịch hẹn: đổi ngày / người phụ trách (Lịch nhóm + board Tổng quan), cảnh báo trùng giờ / nghỉ phép / không có ca, nút Hoàn tác | `demo-88` | [x] |
| T57 Bán hàng tại quầy (`/stores/:id/pos`): khu vực / tầng, bàn / phòng, tính giờ (block, tối thiểu), mở bàn, gọi món, chuyển bàn, đặt trước, đang dọn, thanh toán → đơn nguồn `pos` | `demo-88` | [x] |
| T58 Trang Báo cáo (`GET /stores/:id/reports`): doanh thu theo ngày / giờ / kênh / thanh toán, bán chạy, bàn / phòng; bỏ doanh thu khỏi Tổng quan | `demo-88` | [x] chưa phân quyền nhân viên không xem báo cáo |
| T59 Tin nhắn ở Trang điều hành tải lại liên tục (vòng lặp `onUnreadChange` → render lại → tải lại hội thoại), phản hồi cũ đè hội thoại mới, cuộn cả trang | `demo-88` | [x] |
| T60 Gói dịch vụ Free (0đ, 100MB ảnh) & Bắt đầu (99.000đ/tháng, 600MB ảnh) — migration chèn sẵn, có gói cùng mã thì giữ nguyên | `demo-88` | [x] hạn mức tạm đặt, sửa ở Gói dịch vụ |
| T61 Thẻ tích tem thật: số tem, sản phẩm áp dụng, mỗi món / mỗi đơn, quà, biểu tượng; tự cộng khi đơn hoàn thành; đổi quà / cộng trừ tay; Mini App hiện tem thật của khách | `demo-88` | [x] Mini App cần deploy lại để thấy |
| T62 Kho: giá vốn bình quân, phiếu nhập kho (huỷ được), giá trị tồn kho; tự trừ kho khi đơn hoàn thành / trả lại khi mở lại | `demo-88` | [x] |
| T63 BOM (định mức nguyên liệu) + loại "Nguyên liệu"; giá vốn món = tổng nguyên liệu, "làm được N" | `demo-88` | [x] số lượng định mức là số nguyên (dùng g / ml / cái) |
| T64 Phân loại & bán kèm (size / topping, chọn 1 / nhiều, giá cộng thêm, nguyên liệu thêm) — web quản trị & bán tại bàn | `demo-88` | [x] Mini App chưa có màn chọn tuỳ chọn (cần làm + deploy) |
| T65 Báo cáo: giá vốn hàng bán, lợi nhuận gộp, biên LN, lãi từng món | `demo-88` | [x] |
| T66 Bán hàng: tạo nhanh khách mới khi gắn khách vào bàn | `demo-88` | [x] |
| T67 Giao diện quản trị kiểu Jira / Figma (thứ bậc chữ: trang 14 › khối 12 › nội dung 11 › phụ 10 › chú thích 9 › nhãn nhóm 8 `text-3xs`): khung chung `ui/AdminShell` (thanh trên 48px, tìm nhanh Ctrl K, menu trái theo nhóm, breadcrumb), bảng màu Atlassian + bo góc gọn qua biến CSS (chỉ trong html.admin-ui), theme antd, board lịch hẹn kiểu Jira. Menu gộp 17 → 12 mục (`NAV_TABS` trong StoreConsole: Lịch hẹn & Sự kiện · Khách hàng + Tin nhắn OA · Thư viện = Album/Kho ảnh/Tài liệu · Thiết lập & Hỗ trợ — tab đầu trang, URL cũ giữ nguyên). Trang điều hành gộp 14 → 9 mục (Tin nhắn & Chăm sóc + Lịch gọi lại · App khách hàng = Cấu hình + Build · Gói & Voucher · Bảo mật = Chống spam + Nhật ký · Hạ tầng = API + Dung lượng); tab dùng chung `ui/SectionTabs`, Ctrl K tìm từng trang con qua `ShellNavItem.children`; bỏ icon ở tiêu đề trang cho đồng bộ | `demo-89` | [x] |
| T68 Mini App gian hàng: giỏ hàng & đặt hàng thật — bấm món → chọn size/topping (`store-runtime/cart.tsx`), thanh giỏ nổi, đặt hàng `POST /shop/:slug/me/orders` (giá + giá vốn + tuỳ chọn tính lại ở máy chủ); mục nhập tay trong thiết kế khớp món theo tên; nút "Đăng nhập 1 chạm bằng Zalo" đăng nhập thật | `demo-89` | [x] **chưa deploy Mini App** |
| T69 Tạo đơn (trang Đơn hàng): món có size/topping mở hộp chọn tuỳ chọn như bán tại bàn | `demo-89` | [x] |
| T70 Tài khoản web cho nhân viên: hồ sơ nhân sự → email Google + tick mục được xem (mẫu Thu ngân / Quản lý ca / Toàn quyền). Menu chỉ hiện mục được cấp; máy chủ chặn theo mục (`StoresService.ensureSection`): Báo cáo, Nhân sự & lương (ẩn lương nếu không có quyền), Thiết lập, Sản phẩm, Bán hàng… Chỉ chủ shop cấp quyền | `demo-89` | [x] migration `20261126090000_staff_web_login` |
| T71 Tên nhóm menu trái nhỏ, không viết hoa; tách khung quản trị thành component có tên + `data-ui` (TopBar, Sidebar, SidebarGroupLabel, SidebarItem, Breadcrumbs, CommandPalette, SectionTabs, PageHeader, StatCard…) — bảng tên ở `frontend/src/components/ui/README.md` | `demo-89` | [x] |
| T72 Bán hàng: hộp thanh toán 2 nút — "Thanh toán" (bàn sang Đang dọn) · "Thanh toán & dọn bàn" (bàn trống ngay) | `demo-89` | [x] |
| T73 Lựa chọn size/topping: nhập nguyên liệu dùng thêm + SL ngay cạnh tên | `demo-89` | [x] |
| T74 Combo: nút "Thêm combo" (`StoreComboViews.tsx`) chọn món + SL + giảm (đ / %); `StoreProduct.combo` (migration `20261126120000_product_combo`), giá = tổng món − giảm (máy chủ tính), bán combo trừ kho & tính giá vốn từng món, "làm được" theo tồn món | `demo-89` | [x] |
| T75 Combo: chọn size/topping cố định cho từng món (giá, giá vốn, trừ kho theo lựa chọn) | `demo-89` | [x] |
| T76 Báo cáo → "Xuất file kê khai thuế" (Excel, `exceljs`): Tổng hợp (doanh thu, giá vốn, LN gộp, thuế GTGT/TNCN ước tính theo nhóm ngành TT40/2021), Sổ doanh thu S1-HKD, Theo ngày, Theo sản phẩm, Nhập hàng — `GET /stores/:id/reports/tax-export` | `demo-89` | [x] tỷ lệ thuế chỉ tham khảo |
| T77 Sản phẩm: tồn kho không sửa tay (danh sách & form chỉ xem, nút Nhập kho; backend bỏ qua `stock` khi PATCH, món mới tồn 0); lãi bỏ khỏi danh sách, chỉ xem trong form Sửa (`ProfitPreview`) | `demo-90` | [x] |
| T78 Liệu trình: dịch vụ khai số buổi / số ngày giữa 2 buổi; "Tạo liệu trình" (Lịch hẹn & Tổng quan) xếp sẵn N lịch hẹn cùng `treatmentId` (sửa từng buổi, báo trùng giờ); nhãn `TreatmentBadge` "LT 2/6" trên lịch nhóm, danh sách, Tổng quan; popover xem tiến trình & dừng liệu trình — `StoreTreatmentViews.tsx`, migration `20261126150000_treatment` | `demo-91` | [x] |
| T79 Khách hàng → tab "Liệu trình": trái danh sách khách (tìm, lọc đang có liệu trình), phải liệu trình của khách (tiến độ, buổi tiếp theo / quá hẹn, đổi trạng thái từng buổi, dừng liệu trình) + Tạo liệu trình điền sẵn khách — `TreatmentsSection` | `demo-92` | [x] |
| T80 Liệu trình: danh sách buổi dạng dòng thời gian (`TreatmentTimeline`); Hoàn thành buổi → nhập kết quả (`StoreBooking.result`), "Lưu & gửi khách" gửi tin dạng thẻ `TreatmentResultCard` (`StoreMessage.card`, web quản trị + Mini App); seed liệu trình mẫu cho spa & phòng khám (`npm run seed:demo -- --treatments`) | `demo-93` | [x] |
| T81 Miniapp Studio: khối "Lịch hẹn của tôi" (sắp tới / lịch sử) & "Liệu trình của tôi" (tiến độ, buổi tiếp, kết quả buổi gần nhất) — dữ liệu mẫu khi thiết kế, dữ liệu thật `/me/bookings` ở Mini App, chưa đăng nhập thì mời đăng nhập | `demo-94` | [x] |
| T82 Thu tiền & công nợ: bấm "Thu tiền" (hoặc chuyển Hoàn thành) ở Lịch hẹn / Tổng quan / Liệu trình → bill `BookingCheckoutModal` (sửa / xoá / thêm dịch vụ, bán thêm sản phẩm, phụ thu, giảm giá, hình thức, khách trả thiếu → ghi nợ) → đơn nguồn "booking"; liệu trình thu theo buổi / trọn gói / linh hoạt (`StoreTreatment`, đơn gói, trả dần); tab Khách hàng → "Công nợ" (thu nợ theo đơn / theo khách); `StoreOrder.paidAmount`, `StorePayment` — migration `20261126190000_billing_debt` | `demo-95` | [x] |
| T83 Chuyển khoản VietQR + Tingee: Thiết lập → "Tài khoản nhận chuyển khoản" (`Store.bankAccount`, mã VietQR tạo trên máy — `data/vietqr.ts`) hiện ở mọi chỗ thu tiền khi chọn Chuyển khoản (`BankQrPanel`: bill lịch hẹn, POS, tạo đơn, liệu trình, thu nợ); "Xác nhận chuyển khoản tự động (Tingee)": Client ID + Secret Token (mã hoá), webhook `/api/tingee/webhook/:slug` (xác thực URL HMAC-SHA256, chữ ký HMAC-SHA512, chống trùng theo transactionCode) → khớp mã `RMxxxxxx` trong nội dung CK với `StorePaymentRequest` → màn hình báo "Đã nhận" — migration `20261126210000_store_bank_account`, `20261126220000_tingee` | | [x] |
| T84 Ví khách: `StoreCustomer.walletBalance` + lịch sử `StoreWalletTxn` (trả thừa / nạp tiền / trừ vào đơn / hoàn tiền / điều chỉnh, luôn có lý do, người thao tác, mã đơn, số dư sau). Bill thu tiền lịch hẹn & thu nợ: "Trừ ví", khách trả thừa → "Cộng vào ví khách" hoặc "Thối lại"; hồ sơ khách → tab "Ví" (nạp / hoàn / điều chỉnh, lý do bắt buộc ≥ 5 ký tự). Trừ ví không âm (updateMany có điều kiện) — migration `20261126230000_customer_wallet` | | [x] |
| T85 Đơn hàng → bấm 1 đơn mở `OrderDetailDrawer`: khách, sản phẩm, tổng / đã thu / còn nợ, lịch sử thu tiền (`GET /stores/:id/orders/:orderId/payments`), đổi trạng thái, thu tiền còn nợ (trừ ví, QR chuyển khoản, trả dư vào ví), in hoá đơn 80mm; danh sách hiện nguồn đơn (Lịch hẹn / Gói liệu trình / Bán tại quầy…) và "Nợ X" | | [x] |
| T55 Thang chữ quản trị 9/10/11px (`ui/AdminTheme.tsx` + `index.css`) | `demo-88` | [x] người dùng đang thử |
| T45 Nhãn tiếng Việt cho action audit mới | `frontend-2b` | [x] test 45/45 (`data/audit-labels.ts`) |
| T44b Thư viện ảnh dùng cờ `inUse/usedIn` + xử lý 409 | `frontend-2b` | [x] test 53/53 |
| T36 Ảnh trình thiết kế: bỏ data URL, tải lên media | `frontend-2b` | [x] chưa thử thật |
| T35 Kiểm tra giao diện bằng trình duyệt | chủ dự án / phiên có công cụ browser | [ ] |

Quy ước khi chạy song song: phiên backend chỉ sửa `backend/`, phiên frontend chỉ sửa `frontend/`; **không sửa TASKS.md / PROJECT.md** (báo lại `demo-f7` để cập nhật), **không commit / push**, không in giá trị `.env`.

### [x] T31. Hạn mức dung lượng theo gói (backend)
- **Đã làm (25/11):** migration `20261125090000_plan_storage_quota`; `src/storage-stats/storage-quota.service.ts` (usage / quotaOf / assertCanUpload), `store-storage.controller.ts` (`GET /stores/:id/storage`, shop khác → 404). Media: kiểm `file.size` trước khi ghi. Album: đã đầy → 413 ngay; còn chỗ → kiểm từng ảnh **sau khi nén**, ảnh làm vượt bị xoá và dừng; lưu được một phần → 201 `{ added, errors, quotaExceeded: true }`. PATCH gói: không gửi = giữ nguyên, `null` = bỏ giới hạn. Test `storage-quota.api.test.ts` (5), `projects.api.test.ts` (2); API 39/39, unit 16/16.
- **Chưa xử lý:** 2 lần tải song song có thể vượt hạn mức một chút (không khoá); ảnh hộp thư + thumbnail không tính vào hạn mức. Server dev cổng 4000 cần khởi động lại.
- `SubscriptionPlan.storageQuotaMb Int?` (null = không giới hạn) — migration bằng `prisma migrate diff`. API gói (`/subscriptions/plans`) trả + nhận trường này.
- Dung lượng đã dùng của store = `SUM(StoreAlbumPhoto.size) + SUM(StoreMedia.sizeBytes)`; hạn mức lấy từ gói của `Store.subscriptionId` (không có gói = không giới hạn).
- Chặn tải lên (album + media) khi vượt: HTTP **413** `{ message: "Gian hàng đã dùng hết dung lượng (đã dùng X / Y)", usedBytes, quotaBytes }`. Kiểm tra trước khi ghi file (tổng byte cả lô).
- `GET /api/stores/:id/storage` (chủ shop + admin) → `{ usedBytes, quotaBytes: number|null, albumBytes, albumPhotos, mediaBytes, mediaFiles, planName: string|null }`.
- `GET /api/admin/storage`: mỗi dòng `stores[]` thêm `quotaBytes: number|null`, `planName: string|null`.
- **Xong khi:** test API: vượt hạn mức → 413; store không gói → tải bình thường; shop A không đọc được storage của shop B.

### [x] T32. Cảnh báo ổ đầy + dọn file
- **Đã làm (25/11):** cron `checkDisk` mỗi giờ (`jobs.service.ts`, event `disk.warning` → link `/controller/storage`; ≥ 80% warn, ≥ 90% critical, mỗi mức ≤ 1 lần / 12h, nhớ trong RAM nên restart sẽ nhắc lại). Script ở `backend/scripts/`, chạy trong `backend/` (cần `.env`; dùng ts-node nên VPS cần devDependencies):
  `npm run storage:orphans [-- --delete]` (bỏ qua file < 60 phút) · `npm run storage:recompress [-- --dry-run]` (chỉ thay khi nhỏ hơn, in tổng trước/sau) · `npm run storage:inline-images [-- --apply]` (quét `builderSchema` + `sliders`; cần `PUBLIC_API_ORIGIN`; store vừa được lưu thì bỏ qua và hoàn tác). Test `test/storage-scripts.test.ts` (3). Sửa `start:prod` → `node dist/src/main`.
- **Chưa thử thật:** gửi Telegram `disk.warning`. **Nên chạy `storage:orphans` hằng tuần** cho tới khi xong T39.
- Cron mỗi giờ (`src/jobs/`): ổ ≥ 80% → `NotifyService` (tối đa 1 lần / 12h), ≥ 90% → mức khẩn.
- Lệnh `npm run storage:orphans` (dry-run mặc định, `--delete` để xoá): file trong `uploads/`, `uploads-private/` không còn bản ghi DB (và ngược lại: bản ghi mất file).
- Lệnh `npm run storage:inline-images` (dry-run mặc định): quét `Store.builderSchema` còn `data:image`, ghi thành file `uploads/` + `StoreMedia`, thay bằng URL.
- Lệnh `npm run storage:recompress`: nén lại ảnh album cũ (chưa phải `.webp`) + tạo thumbnail, cập nhật `size/mime/width/height/storageKey`, chạy tuần tự.

### [x] T33. Bộ triển khai AlmaLinux + sao lưu
- **Đã làm (25/11):** `backend/deploy/`: `README.md` (12 mục: swap, firewalld, SELinux, Node 22, PostgreSQL 16 tinh chỉnh cho 4GB, `.env` B5, build B6, PM2, Nginx, frontend, certbot, cron `storage:orphans` CN 04:00, sao lưu + khôi phục, cập nhật, checklist), `nginx.conf` (50m, gzip, cache `/uploads/`), `ecosystem.config.js` (1 instance fork vì có cron nội bộ, 1500M, `MALLOC_ARENA_MAX=2`), `backup.sh` (pg_dump + snapshot `rsync --link-dest`, giữ 7 bản, `rclone` tuỳ chọn qua `/etc/remini/backup.env`), `remini-backup.service/.timer`, `update.sh`. VPS cài đủ devDependencies (script dùng ts-node).
- **Chưa thử trên VPS thật:** `nginx -t`, certbot, systemd timer, rsync/rclone thật, SELinux.
- Thư mục `deploy/` (đặt trong `backend/deploy/`): hướng dẫn cài (Node LTS, PostgreSQL, Nginx, PM2, certbot, firewalld, SELinux `httpd_can_network_connect`), `nginx.conf` mẫu (`client_max_body_size 50m`, gzip, cache ảnh `/uploads`), `ecosystem.config.js` PM2, `backup.sh` (pg_dump + `uploads*`, giữ 7 bản, tuỳ chọn `rclone` ra ngoài VPS) + systemd timer / cron.
- **Xong khi:** làm theo README trên AlmaLinux 9 sạch là chạy được B4–B6.

### [x] T34. Giao diện hạn mức dung lượng (frontend)
- **Đã làm (25/11):** ô Dung lượng (MB/GB) ở modal gói + tag ở danh mục; cột Gói / Hạn mức + thanh % ở trang Dung lượng (≥ 90% tô đỏ); `StorageBar` "Đã dùng X / Y" ở Album ảnh + drawer album, 413 hiện thông báo và dừng các lô sau. Tự ẩn khi API chưa có. **Chưa thử với API thật.**
- Trang **Gói dịch vụ**: ô "Dung lượng (MB/GB)" khi thêm/sửa gói, hiện ở danh mục gói (trống = không giới hạn).
- Trang **Dung lượng** (`StorageViews.tsx`): cột Hạn mức / gói, thanh % theo hạn mức, tô đỏ store ≥ 90%.
- Trang quản trị shop: thanh "Đã dùng X / Y" ở mục **Album ảnh** (và nơi tải ảnh sản phẩm), lỗi 413 hiện thông báo rõ.

### [x] T36. Ảnh trong trình thiết kế: bỏ data URL
- **Đã làm (25/11):** `src/data/media-api.ts` (`uploadStoreMedia`), `Inspector.tsx` nén ở client rồi tải lên `/stores/:id/media/upload`, dùng URL; 413 hiện thông báo. `MiniAppBuilder.tsx`: mở thiết kế cũ → tự chuyển lần lượt các `data:image` sang URL (báo "Đang chuyển ảnh cũ x/y"), lưu qua tự lưu. **Chưa thử thật.** Shop không mở lại trình thiết kế thì ảnh cũ vẫn là data URL → script hàng loạt ở T32.
- **Hiện trạng:** `frontend/src/miniapp-builder/Inspector.tsx` nén ảnh thành data URL rồi lưu thẳng vào `builderSchema` (JSON trong DB) → phình DB, Mini App phải tải lại cả khối base64 mỗi lần mở, không tính vào hạn mức dung lượng.
- **Làm:** tải ảnh qua `POST /stores/:storeId/media/upload` (đã có, lưu `uploads/`, trả URL công khai) rồi dùng URL; xử lý 413 (T31). Thiết kế cũ còn data URL → khi mở tự tải lên và thay URL (hoặc script backend chuyển hàng loạt).
- **Xong khi:** lưu thiết kế không còn chuỗi `data:image` trong `builderSchema`.

### [x] T39. Xoá file ảnh khi xoá gian hàng (backend)
- **Đã làm (25/11):** trước đây **không có API xoá gian hàng** → thêm `DELETE /api/stores/:id` (chỉ quản trị, audit `store.delete`, xoá HẲN mọi dữ liệu + file album / thumbnail / media / ảnh hội thoại + thư mục `uploads/stores/<id>/`; giao diện chưa gọi). `src/common/store-files.ts`. Sửa lỗi thật: xoá khách của store không xoá file album (sinh file mồ côi); xoá media giờ xoá DB trước, lỗi file chỉ log. Test `store-files.api.test.ts` (3).
- **Cố ý giữ:** xoá sản phẩm không xoá ảnh trong thư viện media (có thể dùng lại) → ảnh thừa vẫn tính vào hạn mức (T43). **Chưa làm:** logo cũ khi đổi logo vẫn giữ lại.
- Xoá store chỉ xoá bản ghi (cascade) → file album / media / thumbnail thành mồ côi. Làm: trước khi xoá store lấy danh sách `storageKey` (StoreAlbumPhoto, StoreMedia), xoá DB rồi xoá file (lỗi xoá file chỉ log). Test API: xoá store → file không còn.

### [x] T37. Giảm bundle trang chủ
- **Đã làm (25/11):** chunk chính 861.275 → 719.450 B (gzip 229,6 kB, −16,5%): `LeadForm.tsx` và `PreviewModal` tải lười. Phần còn lại: antd lõi ~219KB, react-dom ~127KB, react-icons ~54KB, react-router ~40KB — muốn giảm tiếp phải bỏ antd khỏi trang chủ.
- `dist/assets/index-*.js` 861KB (chưa nén) tải ngay ở trang chủ. Tìm thứ kéo vào chunk chính (antd, icon, dayjs locale, dữ liệu mẫu `site.ts`…), tách bằng `lazy`/`manualChunks`. **Xong khi:** chunk vào trang chủ giảm rõ (ghi số trước/sau), các trang vẫn chạy.

### [x] T38. Dọn code chết sau khi bỏ "Album ảnh khách"
- `frontend/src/data/inbox-api.ts`: `fetchGallery`, `patchImage`, `deleteImage`, `uploadCustomerImage`, `GalleryImage` không còn ai dùng (kiểm tra lại trước khi xoá); chuỗi "Album ảnh khách" còn sót.

### [x] T40. Test tự động cho frontend
- **Đã làm (25/11):** `vitest@^3` (vitest mới hơn cần vite ≥ 6), `npm test` trong `frontend/`, test ở `src/__tests__/` (28 test, môi trường node). Tách hàm thuần: `data/format.ts` (`fmtBytes`), `miniapp-builder/inline-images.ts`, `data/store-filter.ts`, `store-sync.ts` (`configKey`, `autosaveDecision`). Chưa test component (hàng đợi trong StoreConsole mô phỏng lại bằng chuỗi promise).
- `vitest` (môi trường node / jsdom khi cần), `npm test` trong `frontend/`. Ưu tiên logic dễ hỏng, không cần trình duyệt: hàng đợi đồng bộ + ánh xạ id tạm (`store-sync.ts`), so sánh tự lưu, `fmtBytes`, đổi data URL ở MiniAppBuilder (tách hàm thuần), lọc store theo khách dự án, xử lý lỗi `ApiError`/413.

### [x] T41. Album: chia lô theo dung lượng
- **Đã làm (25/11):** `data/upload-batch.ts` (`splitBatches` ≤ 45MB / ≤ 30 ảnh, ảnh > 10MB sau nén bị loại); `ApiError.quota` + `apiErrorFromResponse`: 413 có `quotaBytes` = hết hạn mức (dừng các lô, gợi ý nâng gói), 413 khác (Nginx/multer) = "Ảnh quá lớn, thử ít ảnh hơn" và thử lô sau. Chưa thử với Nginx thật.
- Nginx giới hạn 50MB / request, album cho 30 ảnh × 10MB → chia lô ≤ ~45MB (và ≤ 30 ảnh); 413 của Nginx không có JSON → vẫn hiện thông báo dễ hiểu.

### [x] T42. Mini App gian hàng: đăng nhập Zalo + Album + Tin nhắn (`demo-mini-app-store/src/store-runtime/`)
- **Đã làm (25/11):** `shop-session.ts` (token theo slug `remini_shop_<slug>_v1`, 401 → đăng nhập lại 1 lần), `shop-api.ts`, `ShopAccount.tsx` (nút tròn nổi góc dưới phải + chấm đỏ; panel tab Album ảnh / Tin nhắn; lưới `thumbUrl`, xem ảnh lớn, mở link ảnh gốc bằng `openWebview`, gửi tin). `store-app.tsx` chỉ thêm `<ShopAccountButton>`. Ngoài Zalo / thiếu `VITE_API_URL` → màn "Đăng nhập bằng Zalo" + lý do, không crash.
- **Chưa thử trong Zalo thật:** đăng nhập, gọi API thật, vị trí nút so với tab bar, `openWebview`. Deploy 25/11 **lỗi "Permission denied. Please login again"** → chủ dự án chạy `npx zmp-cli login` (quét QR bằng Zalo) rồi deploy lại.
- Đăng nhập khách của store: `POST /shop/:slug/auth/zalo { accessToken, phoneToken? }` → token phạm vi shop (lưu theo slug). Màn **Album** (`/me/albums`, `/me/albums/:id`, ảnh dùng `thumbUrl` ở lưới, link ảnh gốc), **Tin nhắn** (`/me/messages`), chấm đỏ theo `/me/unread`. Không deploy.

### [x] T43. Thư viện ảnh của gian hàng (frontend)
- **Đã làm (25/11):** mục **Thư viện ảnh** (`/admin/media`, `MediaLibraryViews.tsx`): StorageBar, lọc loại, lưới + dung lượng, xoá (ảnh "Đang dùng" cảnh báo đỏ). `data/media-usage.ts` (`findMediaInUse` theo sản phẩm / slider / theme / thiết kế). **Thiếu:** logo / cover / banner không có trong StoreConfig ở frontend nên có thể không được đánh dấu → T44.

### [x] T44. API media trả cờ `inUse` (backend)
- **Đã làm (25/11):** mỗi media có `inUse` + `usedIn` ("logo" | "cover" | "theme" | "slider" | "design" | "banner" | "product"), so khớp URL hoặc `storageKey`; dùng chung với dọn logo cũ. Test `media-usage.api.test.ts` (2). Không tính ảnh trong đơn hàng cũ / mô tả. **Tiếp (T44c):** `DELETE /stores/media/:id` ảnh đang dùng → 409 `{ message, usedIn }`, `?force=1` để ép.
- `GET /stores/:storeId/media` trả thêm `inUse: boolean` (và `usedIn: string[]` như `product`, `slider`, `logo`, `banner`, `design`) tính phía server từ mọi nơi tham chiếu. Frontend ưu tiên cờ server, fallback `findMediaInUse`.
- Màn quản lý media của store (`GET /stores/:storeId/media`, `DELETE /stores/media/:id`): lưới ảnh, dung lượng từng ảnh, lọc theo loại, xoá (cảnh báo ảnh có thể đang dùng trong sản phẩm / thiết kế — đánh dấu "đang dùng" nếu URL xuất hiện trong sản phẩm / slider / `builderSchema`), thanh dung lượng gói.

### T47. Chuẩn hoá giao diện quản trị (frontend, 25/11)
- Font **Be Vietnam Pro** tự host (`@fontsource`), thang chữ: tiêu đề trang 18/600 · tiêu đề khối 15/600 · nội dung 14 · phụ 13 · chú thích 12 (bỏ `text-[10px]/[11px]` trừ badge), số tiền `tabular-nums`.
- Token antd (`main.tsx`): fontSize 14, controlHeight 34, borderRadius 8 / LG 12, Table header nền slate-50 cỡ 13.
- Bộ khung dùng chung `src/components/ui/`: `PageHeader` (tiêu đề + mô tả + nút bên phải), `FilterBar` (tìm kiếm trái co giãn → bộ lọc → nút hành động phải; độ rộng cố định: tìm 240, select 160, khoảng ngày 260; xuống dòng gọn trên mobile), `SectionCard`, `StatCard`. Form trong modal/drawer: nhãn trên, lưới 2 cột từ `sm`, nút "Huỷ" rồi nút chính ở phải.
- Áp lần lượt `/controller/*` rồi `/admin/*`; chỉ đổi trình bày, không đổi hành vi. **Cần xem bằng trình duyệt sau khi xong.**
- **Đã làm (25/11):** `src/fonts.css` (8 woff2 có `unicode-range`, JS chính chỉ +1,4KB), token antd + Table/Card/Modal/Drawer, `src/components/ui/` (`PageHeader`, `FilterBar` + `FilterSelect`/`FilterRange`, `SectionCard`, `StatCard`, `FormLayout`); chữ < 12px → 12px; ~20 header → `PageHeader`, 12 trang dùng `FilterBar`; sidebar 2 console h-9 14/500. Font đổi toàn cục nên trang chủ cũng dùng Be Vietnam Pro.
- **T47b (25/11):** thang chữ gọn hơn — Tailwind đọc biến CSS, `<html class="admin-ui">` ở /admin, /controller: 2xs 11 · xs 12 · sm 13 · base 14 · lg 16 · xl 18 (trang chủ + khung điện thoại `.phone-ui` giữ mặc định); antd 13 / control 32. Bỏ hết `text-[Npx]` trong trang quản trị (trừ AdminLogin). `StatCard` + `StatGrid` (Khách nợ, Tổng quan, mã voucher, Dung lượng); form modal/drawer lưới `gap-x-4 sm:grid-cols-N`; cột tiền căn phải `tabular-nums`; chip lọc Đơn hàng / Cấu hình app → `FilterSelect`.
- **Cần nhìn:** bảng nhiều cột, drawer hẹp, FilterBar trên mobile, badge 11px, StatCard 4 cột ở Tổng quan, form khoản nợ / dự án ở màn hẹp.
- **T48 (25/11, đã chụp màn hình thật 1440 / 390 bằng Chrome headless + phiên admin dev tạm):** FilterBar mobile (bộ lọc + nút cùng hàng); Cấu hình app (cột App đủ rộng, một card, mobile ẩn cột phụ + cuộn trong card); Nhật ký (cột co gọn, ellipsis + tooltip, ẩn IP/Đối tượng ở màn nhỏ); Tệp khách hàng theo PageHeader + FilterBar; phân trang ẩn khi 1 trang; badge sidebar ẩn khi 0; Tổng quan (Empty cho đơn hàng, bỏ khoảng trống, nhãn KPI không viết hoa); Thư viện ảnh (lọc lên thanh FilterBar, "Tải ảnh lên ▾" chọn loại); tab Tin nhắn + Dự án & Ticket dùng antd Tabs như Gói dịch vụ; tiêu đề Kho / Hỗ trợ theo thang.
- **Quy ước bố cục:** nút chính ("Thêm / Tạo …") ở cuối FilterBar; trang không có bộ lọc thì ở PageHeader. Tabs = chuyển khu vực con; Segmented = lọc / đổi kiểu xem trong một danh sách.

### T35. Kiểm tra giao diện + T11 còn lại (frontend)
- Mở bằng trình duyệt: `/controller/inbox` (2 tab Hội thoại / Chăm sóc, badge), `/controller/storage`, album (lưới dùng thumbnail). Sửa lỗi hiển thị / mobile.
- T11: gán `storeId` cho dự án, sửa ngày bắt đầu/hạn dự án trong giao diện.


Mỗi việc ghi rõ file liên quan và tiêu chí xong. Frontend có `npm test` (vitest). Sau mỗi việc: typecheck cả 3 project
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
- **25/11 bổ sung:** `customer.*`, `customer.staff.*`, `plan.*` (+ `plan.storage_quota` khi đổi hạn mức, meta fromMb/toMb), `plan_voucher.*`, `subscription.*`, `store.product.*`, `store.customer.*`, `store.delete`; meta không chứa SĐT/nội dung. Test `audit.api.test.ts` (4). Đổi logo → xoá logo cũ không còn được tham chiếu. **Cố ý chưa gắn:** `/stores/:id/data/*` (đơn, lịch hẹn…), xoá ảnh / album.
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
- `/admin/customers` có tab: Tệp khách hàng · Tin nhắn · Album ảnh khách · Chăm sóc (3 tab sau chỉ quản trị viên). *(Đã đổi ở T22/T30: chuyển sang `/controller`, Album ảnh khách bỏ, Chăm sóc nằm trong Tin nhắn.)* Link cũ `/admin/inbox|files|care` tự chuyển sang tab.
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

### [x] T30. Lưu trữ ảnh + thống kê dung lượng + gọn trang điều hành (24/11/2026)
- Ảnh album nén khi tải lên (`sharp`, `album-storage.service.ts`): ≤ 2048px, WebP q80 + thumbnail 400px ở `uploads-private/albums/thumbs/` (xem qua `?t=1`, API trả `thumbUrl`). Ảnh cũ chưa nén vẫn xem bình thường.
- `/controller`: bỏ mục "Album ảnh khách"; "Chăm sóc" gộp vào "Tin nhắn" (tab `?tab=care`); mục mới **Dung lượng** (`/controller/storage`, `StorageViews.tsx`) ← `GET /api/admin/storage` (`src/storage-stats/`): ổ đĩa server, DB, ảnh theo từng gian hàng + tổng (theo DB), dung lượng thật trên ổ (cache 5 phút).
- Thư mục `customer-app/` chứa Mini App riêng của từng khách (README).
- **Chưa xem giao diện bằng trình duyệt.** VPS dự kiến: AlmaLinux, 2 CPU / 4GB RAM / 40GB NVMe → ổ là giới hạn chính (xem T31–T33).

### [x] T11. Trang quản trị: hoàn thiện
- **25/11:** `PortalAdminViews.tsx` tạo dự án chọn gian hàng + ngày bắt đầu/hạn; thẻ dự án sửa ngày, gán gian hàng. Bỏ gán gian hàng / xoá ngày gửi `null` (backend đã nhận); danh sách gian hàng lọc theo khách của dự án. **Chưa thử trên trình duyệt.**
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
- `sharp` phải ghim `0.34.x` (0.35 lệch type với `module: commonjs`). Trên AlmaLinux (glibc) `npm ci` tự tải binary dựng sẵn.
