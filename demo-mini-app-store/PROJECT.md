> **Lưu ý:** tài liệu cũ của riêng Mini App. Bản cập nhật cho toàn dự án: [../PROJECT.md](../PROJECT.md), [../TASKS.md](../TASKS.md).

# Demo Mini App Store: mô tả dự án

> Zalo Mini App giới thiệu các mẫu Mini App (template demo) của **Công ty T**, để khách hàng xem thử và chọn mẫu trước khi đặt thiết kế.

---

## 1. Bối cảnh

- **Công ty T** là hộ kinh doanh chuyên thiết kế và triển khai Zalo Mini App cho doanh nghiệp, cửa hàng, cơ quan.
- Khách thường khó hình dung Mini App của mình sẽ trông ra sao. App này gom các **mẫu demo theo ngành** vào **một** Mini App để:
  1. Sales gửi cho khách **một link hoặc QR mở thẳng vào đúng mẫu** khách quan tâm.
  2. Khách tự lướt **danh sách demo**, xem thông tin công ty, khách hàng tiêu biểu, ưu đãi, rồi để lại liên hệ.
- Tham khảo cách trình bày: <https://miniapp.vn/demo#demo-gallery> (43 mẫu, lọc theo ngành, thẻ có ảnh, nhãn ngành, nút "Xem mẫu & quét QR").

## 2. Cơ chế điều hướng khi mở app

App đọc query param lúc khởi động:

| Tham số | Giá trị | Ý nghĩa |
|---|---|---|
| `mode` | `Template` | Mở chế độ xem một mẫu demo |
| `templateID` | ví dụ `thoi_trang_01` | Mã của mẫu cần hiển thị |

Ví dụ link chia sẻ:

```
https://zalo.me/s/<APP_ID>/?mode=Template&templateID=thoi_trang_01
```

Luồng xử lý:

```
Mở app
 ├─ mode=Template & templateID hợp lệ  → vào thẳng màn hình demo của template đó
 │                                        (có nút nổi "Về trang Công ty T" / "Tư vấn mẫu này")
 ├─ mode=Template & templateID không tồn tại → báo "Mẫu không tồn tại" → chuyển về Trang chủ
 └─ không có tham số                   → Trang chủ (Showcase): danh sách DEMO + thông tin công ty
```

Ghi chú kỹ thuật:
- Đọc tham số bằng `window.location.search` (`URLSearchParams`), kèm `getRouteParams()` của `zmp-sdk` làm dự phòng. **Phải kiểm tra trên thiết bị thật**, vì cách truyền query khi mở bằng link `zalo.me/s/...` hoặc QR có thể khác lúc chạy `zmp start`.
- So khớp `templateID` không phân biệt hoa thường. `mode` nhận `Template` và `template`.

## 3. Chức năng

### 3.1. Trang chủ (Showcase), khi không có tham số
1. **Header / Hero**: logo, tên Công ty T, slogan, ảnh mẫu nổi bật, 2 nút: "Xem tất cả demo" và "Tư vấn ngay".
2. **Số liệu nổi bật**: số ngành, số Mini App đã làm, số khách hàng, thời gian triển khai.
3. **Danh sách DEMO**:
   - Thanh lọc ngành nằm ngang (chip): Tất cả, Bán lẻ, Thời trang, F&B, Siêu thị, Mẹ & Bé, Spa/Salon, Y tế, Giáo dục, Du lịch/Khách sạn, Bất động sản, Cơ quan/Sở ban ngành, ...
   - Ô tìm kiếm theo tên mẫu.
   - Thẻ demo gồm ảnh thumbnail, mã + tên mẫu (VD: `T01 · Thời trang NOVA`), nhãn ngành (một mẫu có thể có nhiều nhãn), nút **"Xem demo"**.
   - Bộ đếm "N mẫu".
4. **Cách hoạt động**: 3 bước: Chọn mẫu → Xem demo → Liên hệ tư vấn và tuỳ biến.
5. **Khách hàng tiêu biểu**: logo hoặc tên, ngành, ảnh Mini App đã làm, lời nhận xét (testimonial).
6. **Ưu đãi / Bảng giá**: các gói (Cơ bản / Tiêu chuẩn / Nâng cao), ưu đãi đang chạy (giảm giá, dùng thử, tặng tên miền hay OA...), thời hạn ưu đãi.
7. **Thông tin công ty**: giới thiệu, địa chỉ, hotline, email, Zalo OA, giờ làm việc.
8. **Liên hệ / Đăng ký tư vấn**: form (tên, SĐT, ngành, mẫu quan tâm, ghi chú), nút "Chat Zalo OA", nút "Gọi ngay".

### 3.2. Màn hình demo template, khi `mode=Template`
- Hiển thị **toàn màn hình** đúng giao diện mẫu, như một Mini App thật: trang chủ, danh mục, chi tiết, giỏ hàng hoặc đặt lịch, ... Dữ liệu là dữ liệu giả.
- **Thanh demo nổi** (nhỏ, thu gọn được): "Đây là bản demo" · "Tư vấn mẫu này" · "Xem mẫu khác".
- Các hành động "thật" (thanh toán, đặt hàng, gửi form) chỉ hiện popup *"Đây là bản demo. Liên hệ Công ty T để triển khai"*.
- Nút **Chia sẻ** gửi link có sẵn `templateID`.

### 3.3. Danh mục mẫu dự kiến (đợt đầu)

| templateID | Tên | Ngành | Màn hình chính |
|---|---|---|---|
| `thoi_trang_01` | Shop thời trang | Bán lẻ · Thời trang | Home, danh mục, chi tiết SP (size/màu), giỏ hàng, tài khoản |
| `fnb_cafe_01` | Quán cà phê | F&B | Menu, tuỳ chọn món (size, topping), giỏ, đặt mang đi / tại bàn |
| `fnb_nha_hang_01` | Nhà hàng | F&B | Menu, đặt bàn, ưu đãi |
| `sieu_thi_01` | Siêu thị mini | Siêu thị | Danh mục, tìm kiếm, khuyến mãi, giỏ hàng |
| `me_va_be_01` | Shop mẹ & bé | Mẹ & Bé | Danh mục theo độ tuổi, SP, tích điểm |
| `spa_01` | Spa / Salon | Spa/Salon | Dịch vụ, đặt lịch, chọn nhân viên, thẻ thành viên |
| `phong_kham_01` | Phòng khám | Y tế | Chuyên khoa, bác sĩ, đặt lịch khám, hồ sơ |
| `truong_hoc_01` | Trường học | Giáo dục | Thông báo, thời khoá biểu, học phí, liên hệ GV |
| `khach_san_01` | Khách sạn | Du lịch/Khách sạn | Phòng, đặt phòng, tiện ích, đánh giá |
| `bat_dong_san_01` | Bất động sản | Bất động sản | Dự án, chi tiết căn, đăng ký xem nhà |
| `co_quan_01` | UBND / Sở ban ngành | Cơ quan | Tin tức, thủ tục, phản ánh, tra cứu hồ sơ |
| `qua_tang_01` | Tiệm quà tặng | Bán lẻ | Quà theo dịp / người nhận, giỏ quà, gói quà, viết thiệp |
| `do_theu_01` | Order đồ thêu | Bán lẻ · Thời trang | Chọn phôi, tuỳ biến chữ / màu chỉ / hoạ tiết (xem trước), tiến độ đơn thêu |
| `thue_trang_phuc_01` | Cho thuê trang phục | Thời trang | Danh mục, chi tiết (size, ngày thuê, tính cọc), lịch thuê / trả đồ |
| `bida_01` | Quán bida | Giải trí · F&B | Sơ đồ bàn, đặt bàn theo giờ, gọi đồ lên bàn |

Quy ước `templateID`: `<nganh>_<so thu tu 2 chu so>`, viết thường, không dấu, dùng `_`.

## 4. Kiến trúc kỹ thuật

- **Nền tảng**: Zalo Mini App, React 18 + TypeScript, `zmp-ui`, `zmp-sdk`, Tailwind CSS + SCSS, Jotai (state), Vite.
- **Cấu trúc thư mục** (đã triển khai):

```
src/
├─ app.ts                       # Điểm vào
├─ components/
│  ├─ layout.tsx                # Router gốc: "/" + route của mọi mẫu "live" + 404
│  └─ showcase/                 # Các khối của trang chủ Công ty T
│     ├─ hero.tsx               # Logo, slogan, CTA, số liệu
│     ├─ template-gallery.tsx   # Danh sách DEMO: tìm kiếm + lọc ngành
│     ├─ template-card.tsx      # Thẻ mẫu + thumbnail điện thoại (CSS)
│     ├─ info-sections.tsx      # Quy trình, Ưu đãi, Khách hàng, Bảng giá
│     ├─ contact.tsx            # Form tư vấn + thông tin liên hệ
│     └─ section.tsx
├─ pages/
│  ├─ home.tsx                  # Trang chủ Showcase + chuyển hướng theo ?mode=Template
│  └─ not-found.tsx
├─ data/
│  ├─ company.ts                # ← SỬA thông tin Công ty T, ưu đãi, bảng giá, khách hàng ở đây
│  └─ categories.ts             # Danh sách ngành (chip lọc)
├─ hooks/use-launch-params.ts   # Đọc mode / templateID lúc khởi động
├─ utils/                       # format giá, wrapper API Zalo (gọi, chat OA, chia sẻ)
└─ templates/                   # MỖI MẪU LÀ MỘT THƯ MỤC ĐỘC LẬP
   ├─ index.ts                  # Registry: danh sách mẫu (live + sắp ra mắt)
   ├─ types.ts                  # TemplateMeta, TemplateRoute
   ├─ paths.ts                  # /t/<templateId>/<trang>
   ├─ _shared/                  # Dùng chung cho mọi mẫu
   │  ├─ template-frame.tsx     # Bọc trang mẫu: theme + lazy-load + nút DEMO nổi
   │  ├─ template-navigation.tsx# Vẽ thanh tab của mẫu ngoài AnimationRoutes
   │  ├─ demo-bar.tsx           # Nút "DEMO" → Tư vấn / Chia sẻ / Xem mẫu khác
   │  ├─ demo-action.tsx        # useDemoAction(): popup "Đây là bản demo"
   │  └─ kit/                   # BỘ COMPONENT DÙNG CHUNG (import từ "../../_shared/kit")
   │     ├─ theme.ts            # useTplTheme(), NAV_HEIGHT
   │     ├─ layout.tsx          # TplPage, BrandHeader, TplHeader, SearchBox, ChipRow, BannerSwiper,
   │     │                      # Tile, ShortcutGrid, QtyStepper, ActionBar, PrimaryButton, Card...
   │     ├─ bottom-nav.tsx      # TplBottomNav (BottomNavigation ZaUI, trượt theo hướng tab)
   │     ├─ cart.tsx            # createCartStore(), useAddToCart(), CartView
   │     ├─ product.tsx         # ProductTileCard (thêm nhanh vào giỏ)
   │     ├─ booking.tsx         # DayPicker, TimeSlots, BookingCard, createBookingStore()
   │     ├─ account.tsx         # AccountPage (hồ sơ, thẻ thành viên, menu)
   │     └─ form.tsx            # Field, TextInput, TextArea, Segmented
   ├─ thoi_trang_01/            # T01 · Shop thời trang (LUMI) — mẫu đầu tiên, có component riêng
   ├─ fnb_cafe_01/              # T02 · Quán cà phê (Mộc Coffee)
   ├─ spa_01/                   # T03 · Spa / Salon (Lotus Spa)
   ├─ fnb_nha_hang_01/          # T04 · Nhà hàng (Bếp Quê Nhà)
   ├─ sieu_thi_01/              # T05 · Siêu thị mini (Xanh Mart)
   ├─ me_va_be_01/              # T06 · Shop mẹ & bé (Bé Yêu Shop)
   ├─ phong_kham_01/            # T07 · Phòng khám (An Khang Clinic)
   ├─ truong_hoc_01/            # T08 · Trường học (THCS Ánh Sao)
   ├─ khach_san_01/             # T09 · Khách sạn (Sea Breeze Hotel)
   ├─ bat_dong_san_01/          # T10 · Bất động sản (An Cư Land)
   ├─ co_quan_01/               # T11 · UBND / Sở ban ngành (tên giả lập)
   ├─ qua_tang_01/              # T12 · Tiệm quà tặng (Hộp Quà Xinh)
   ├─ do_theu_01/               # T13 · Order đồ thêu (Thêu Xinh Atelier)
   ├─ thue_trang_phuc_01/       # T14 · Cho thuê trang phục (Xiêm Y Studio)
   └─ bida_01/                  # T15 · Quán bida (Cơ Thủ Billiards)
```

Cấu trúc của một mẫu (VD `fnb_cafe_01/`):

```
index.ts        # meta: id, code, tên, ngành, theme, routes (lazy), navigation
data.ts         # TEMPLATE_ID, path(), dữ liệu giả, state (giỏ hàng / lịch hẹn)
nav.tsx         # thanh tab: <TplBottomNav tabs=[...] />
components.tsx  # (tuỳ chọn) component riêng của mẫu
pages/          # mỗi trang một file
```

- **Quy tắc**: code của một mẫu chỉ import từ thư mục của chính nó, từ `templates/_shared` và `utils`. Không import chéo giữa các mẫu.
- **Registry** (`src/templates/index.ts`): mỗi mẫu export một `TemplateMeta` (`id`, `code`, `name`, `categories`, `color`, `features`, `status: "live" | "coming_soon"`, `routes`). Mẫu `coming_soon` vẫn hiện trên trang chủ với nhãn "Sắp ra mắt".
- Mỗi trang của mẫu **lazy-load** (`React.lazy`), nên mẫu nằm ở chunk riêng và không làm nặng trang chủ.
- Route của mẫu có dạng `/t/<templateId>/<trang>`, VD `/t/thoi_trang_01/product/p05`.

### Thêm một mẫu mới
1. Copy một mẫu gần giống (VD `src/templates/fnb_cafe_01/`) thành `src/templates/<templateId>/`, rồi sửa `TEMPLATE_ID` trong `data.ts`.
2. Sửa `index.ts` của mẫu: `id`, `code`, `name`, `categories`, `color`, `theme`, `features`, `routes`, `navigation`.
3. Trong `src/templates/index.ts`: import mẫu mới và thêm vào mảng `templates`.
4. Dùng component trong `_shared/kit` trước; chỉ viết component riêng khi kit không có.
5. Thử: `http://localhost:3000/?mode=Template&templateID=<templateId>`.
- Ảnh sản phẩm hiện vẽ bằng SVG (`product-image.tsx`). Khi có ảnh thật: dùng WebP, đặt trong thư mục của mẫu hoặc trên CDN nếu bundle vượt giới hạn của Zalo.
- Thông tin công ty, ưu đãi, bảng giá để trong `src/data/company.ts` (giai đoạn 1). Giai đoạn sau có thể chuyển sang API hoặc Google Sheet để sửa không cần deploy.

## 5. Tích hợp Zalo

| Tính năng | API | Ghi chú |
|---|---|---|
| Đọc tham số khởi động | `window.location.search`, `getRouteParams` | Kiểm tra trên máy thật |
| Chia sẻ mẫu | `openShareSheet` | Link kèm `templateID` |
| Chat OA | `openChat` / `followOA` | Cần OA ID của Công ty T |
| Gọi điện | `openPhone` | |
| Lấy SĐT khách (form tư vấn) | `getPhoneNumber` | Cần xin quyền, có thể bỏ qua giai đoạn 1 |
| Thông tin người dùng | `getUserInfo` | Tự điền tên vào form |

## 6. Phạm vi ngoài dự án (giai đoạn 1)
- Không có thanh toán thật, không có backend đơn hàng.
- Không có CMS quản trị template (sửa trực tiếp trong code).

## 7. Chạy dự án

```bash
npm install
npm start             # zmp start → http://localhost:3000
npx tsc -p .          # kiểm tra kiểu
# Test chế độ template:
# http://localhost:3000/?mode=Template&templateID=thoi_trang_01
npm run build
npm run deploy        # zmp login trước
```

Danh sách việc cần làm: xem [TODO.md](TODO.md).
