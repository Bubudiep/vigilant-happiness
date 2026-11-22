> **Lưu ý:** tài liệu cũ của riêng Mini App. Bản cập nhật cho toàn dự án: [../PROJECT.md](../PROJECT.md), [../TASKS.md](../TASKS.md).

# Quản lý công việc: Demo Mini App Store

Đặc tả: [PROJECT.md](PROJECT.md) · Checklist chi tiết: [TODO.md](TODO.md)

File này theo dõi **ai làm gì, đến hạn nào, trạng thái ra sao**. Cập nhật mỗi khi bắt đầu, xong việc hoặc bị vướng.

---

## Quy ước

**Trạng thái:** `📋 Todo` · `🚧 Doing` · `👀 Review` · `✅ Done` · `⛔ Blocked` · `💤 Hoãn`

**Ưu tiên:** `P0` bắt buộc cho bản đầu · `P1` nên có · `P2` để sau

**Mã việc:** `<nhóm>-<số>`
- `ND`: Nội dung
- `NT`: Nền tảng
- `SC`: Showcase (trang chủ)
- `KT`: Khung template
- `TP`: Mẫu demo
- `PH`: Phát hành

**Ước lượng:** đơn vị ngày công (0.5 = nửa ngày).

---

## Tổng quan tiến độ

| Giai đoạn | Tổng | ✅ | 🚧 | ⛔ | Tiến độ |
|---|---|---|---|---|---|
| 0. Nội dung | 7 | 0 | 0 | 0 | 0% |
| 1. Nền tảng | 7 | 6 | 0 | 0 | 86% |
| 2. Showcase | 9 | 8 | 0 | 1 | 89% |
| 3. Khung template | 5 | 5 | 0 | 0 | 100% |
| 4. Mẫu demo | 16 | 16 | 0 | 0 | 100% |
| 5. Phát hành | 6 | 1 | 0 | 0 | 17% |
| **Tổng** | **50** | **36** | **0** | **1** | **72%** |

---

## Sprint hiện tại

**Sprint 1** (17/11/2026 – 23/11/2026). Mục tiêu: chốt nội dung, dựng nền tảng, đọc được `templateID` trên máy thật.

| Mã | Việc | Người làm | Trạng thái |
|---|---|---|---|
| ND-01 | Logo, slogan, màu thương hiệu | | 📋 Todo |
| ND-02 | Thông tin liên hệ, OA ID | | 📋 Todo |
| ND-03 | Chốt danh sách mẫu đợt đầu | | 📋 Todo |
| ND-07 | Tạo Mini App, lấy App ID | | 📋 Todo |
| NT-01 | Dọn template blank, tạo cấu trúc thư mục | | ✅ Done |
| NT-02 | `useLaunchParams` + router `/` và `/t/:id` | | ✅ Done |
| NT-07 | Test link/QR `mode=Template` trên máy thật | | 📋 Todo |

---

## Backlog

### 0. Nội dung (Công ty T cung cấp)

| Mã | Việc | Ưu tiên | Người làm | Ước lượng | Hạn | Trạng thái | Ghi chú |
|---|---|---|---|---|---|---|---|
| ND-01 | Logo, tên hiển thị, slogan, màu thương hiệu | P0 | | 0.5 | | 📋 Todo | |
| ND-02 | Hotline, email, địa chỉ, Zalo OA ID, giờ làm việc | P0 | | 0.5 | | 📋 Todo | |
| ND-03 | Chốt danh sách ngành + mẫu đợt đầu | P0 | | 0.5 | | 📋 Todo | Xem PROJECT.md §3.3 |
| ND-04 | Khách hàng tiêu biểu (logo, ảnh, testimonial) | P1 | | 1 | | 📋 Todo | Cần xin phép khách |
| ND-05 | Bảng giá các gói + ưu đãi hiện tại | P1 | | 0.5 | | 📋 Todo | |
| ND-06 | Số liệu nổi bật | P1 | | 0.25 | | 📋 Todo | |
| ND-07 | Tạo Mini App trên mini.zalo.me, lấy App ID | P0 | | 0.25 | | 📋 Todo | Cập nhật `app-config.json` |

### 1. Nền tảng

| Mã | Việc | Ưu tiên | Người làm | Ước lượng | Hạn | Trạng thái | Ghi chú |
|---|---|---|---|---|---|---|---|
| NT-01 | Dọn template blank, tạo cấu trúc thư mục | P0 | | 0.5 | | ✅ Done | |
| NT-02 | `useLaunchParams` + router `/`, `/t/:templateID/*` | P0 | | 1 | | ✅ Done | |
| NT-03 | Xử lý `templateID` sai: thông báo rồi về `/` | P0 | | 0.25 | | ✅ Done | |
| NT-04 | `templates/index.ts`: registry + lazy-load | P0 | | 0.5 | | ✅ Done | |
| NT-05 | `data/company.ts` | P0 | | 0.5 | | ✅ Done | Đang dùng dữ liệu tạm, chờ ND-01, ND-02 |
| NT-06 | Theme Tailwind (màu, font) | P0 | | 0.5 | | ✅ Done | Phụ thuộc ND-01 |
| NT-07 | Test link/QR `mode=Template` trên máy thật | P0 | | 0.5 | | 📋 Todo | Phụ thuộc ND-07, NT-02 |

### 2. Showcase (trang chủ)

| Mã | Việc | Ưu tiên | Người làm | Ước lượng | Hạn | Trạng thái | Ghi chú |
|---|---|---|---|---|---|---|---|
| SC-01 | Hero | P0 | | 0.5 | | ✅ Done | |
| SC-02 | FilterBar theo ngành | P0 | | 0.5 | | ✅ Done | |
| SC-03 | TemplateCard + lưới demo + bộ đếm | P0 | | 1 | | ✅ Done | |
| SC-04 | Tìm kiếm theo tên mẫu | P1 | | 0.5 | | ✅ Done | |
| SC-05 | "Cách hoạt động" + số liệu nổi bật | P1 | | 0.5 | | ✅ Done | |
| SC-06 | Khách hàng tiêu biểu + testimonial | P1 | | 1 | | ✅ Done | Dữ liệu tạm, chờ ND-04 |
| SC-07 | Ưu đãi / bảng giá | P1 | | 0.5 | | ✅ Done | Dữ liệu tạm, chờ ND-05 |
| SC-08 | Thông tin công ty + gọi điện / chat OA | P0 | | 0.5 | | ✅ Done | |
| SC-09 | Form đăng ký tư vấn | P1 | | 1 | | ⛔ Blocked | Giao diện xong; chưa chốt nơi nhận dữ liệu |

### 3. Khung template

| Mã | Việc | Ưu tiên | Người làm | Ước lượng | Hạn | Trạng thái | Ghi chú |
|---|---|---|---|---|---|---|---|
| KT-01 | `templates/_shared/template-frame.tsx` + loading | P0 | | 0.5 | | ✅ Done | |
| KT-02 | DemoBar nổi | P0 | | 0.5 | | ✅ Done | |
| KT-03 | `demoAction()` popup "Đây là bản demo" | P0 | | 0.25 | | ✅ Done | |
| KT-04 | Chia sẻ mẫu (`openShareSheet`) | P1 | | 0.25 | | ✅ Done | Cần ảnh `company.shareThumbnail` mới chia sẻ được |
| KT-05 | Scope theme riêng cho từng mẫu | P1 | | 0.5 | | ✅ Done | |

### 4. Mẫu demo

| Mã | templateID | Ưu tiên | Người làm | Ước lượng | Hạn | Trạng thái | Ghi chú |
|---|---|---|---|---|---|---|---|
| TP-00 | `_shared` (component dùng chung) | P1 | | 1 | | ✅ Done | Bộ kit dùng chung: `templates/_shared/kit` |
| TP-01 | `thoi_trang_01` | P0 | | 3 | | ✅ Done | |
| TP-02 | `fnb_cafe_01` | P0 | | 2 | | ✅ Done | |
| TP-03 | `spa_01` | P0 | | 2 | | ✅ Done | |
| TP-04 | `fnb_nha_hang_01` | P1 | | 2 | | ✅ Done | |
| TP-05 | `sieu_thi_01` | P1 | | 2 | | ✅ Done | |
| TP-06 | `me_va_be_01` | P1 | | 2 | | ✅ Done | |
| TP-07 | `phong_kham_01` | P1 | | 2 | | ✅ Done | |
| TP-08 | `truong_hoc_01` | P2 | | 2 | | ✅ Done | |
| TP-09 | `khach_san_01` | P2 | | 2 | | ✅ Done | |
| TP-10 | `bat_dong_san_01` | P2 | | 2 | | ✅ Done | |
| TP-11 | `co_quan_01` | P2 | | 2 | | ✅ Done | |
| TP-12 | `qua_tang_01` | P2 | | 1.5 | | ✅ Done | Tiệm quà tặng (Hộp Quà Xinh) |
| TP-13 | `do_theu_01` | P2 | | 2 | | ✅ Done | Order đồ thêu, có trang tuỳ biến xem trước |
| TP-14 | `thue_trang_phuc_01` | P2 | | 2 | | ✅ Done | Cho thuê trang phục, tính cọc |
| TP-15 | `bida_01` | P2 | | 2 | | ✅ Done | Quán bida, sơ đồ bàn + gọi đồ |

### 5. Phát hành

| Mã | Việc | Ưu tiên | Người làm | Ước lượng | Hạn | Trạng thái | Ghi chú |
|---|---|---|---|---|---|---|---|
| PH-01 | Tối ưu ảnh + kiểm tra dung lượng bundle | P0 | | 0.5 | | 📋 Todo | |
| PH-02 | Test Android/iOS, dark mode, nút back | P0 | | 1 | | 📋 Todo | |
| PH-03 | Test toàn bộ link `templateID` | P0 | | 0.25 | | 📋 Todo | |
| PH-04 | README: hướng dẫn thêm template mới | P1 | | 0.25 | | ✅ Done | Ghi ở PROJECT.md §4 "Thêm một mẫu mới" |
| PH-05 | Build, deploy, gửi duyệt | P0 | | 0.5 | | 📋 Todo | |
| PH-06 | Bảng link + QR từng mẫu cho sales | P1 | | 0.5 | | 📋 Todo | |

---

## Vướng mắc / cần quyết định

| Ngày | Vấn đề | Ảnh hưởng | Người quyết | Kết luận |
|---|---|---|---|---|
| 17/11/2026 | Form tư vấn gửi dữ liệu về đâu? (Google Sheet / webhook / OA) | SC-09 | Công ty T | |
| 17/11/2026 | Có dùng ảnh thật của khách hàng tiêu biểu không? | ND-04, SC-06 | Công ty T | |
| 17/11/2026 | Ưu đãi có tự ẩn khi hết hạn không? | SC-07 | Công ty T | |

---

## Nhật ký công việc

Ghi mới nhất lên trên.

| Ngày | Người | Nội dung |
|---|---|---|
| 18/11/2026 | | Đăng ký 4 mẫu mới vào registry: T12 `qua_tang_01`, T13 `do_theu_01`, T14 `thue_trang_phuc_01`, T15 `bida_01`. Cập nhật PROJECT.md. tsc + build OK. Chưa test giao diện trên trình duyệt / Zalo. |
| 17/11/2026 | | Làm xong 10 mẫu còn lại (T02–T11) trên bộ kit dùng chung `_shared/kit` (header, thanh tab ZaUI, giỏ hàng, đặt lịch, tài khoản). tsc + build OK, đã chụp màn hình từng mẫu. |
| 17/11/2026 | | Cấu trúc lại thư mục (src/templates/<id>/), làm trang chủ Showcase, khung template (nút DEMO, popup demo, lazy-load), mẫu T01 thoi_trang_01 (5 trang). tsc + build OK, đã chụp màn hình trên trình duyệt. Chưa test trên Zalo thật. |
| 17/11/2026 | | Tạo PROJECT.md, TODO.md, TASKS.md. |
