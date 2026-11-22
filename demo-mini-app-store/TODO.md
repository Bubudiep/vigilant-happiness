> **Lưu ý:** tài liệu cũ của riêng Mini App. Bản cập nhật cho toàn dự án: [../PROJECT.md](../PROJECT.md), [../TASKS.md](../TASKS.md).

# TODO: Demo Mini App Store

Mô tả dự án và đặc tả: xem [PROJECT.md](PROJECT.md).
Đánh dấu `[x]` khi xong. Ưu tiên: **P0** bắt buộc cho bản đầu · **P1** nên có · **P2** để sau.

---

## Giai đoạn 0: Chuẩn bị nội dung (Công ty T cung cấp)
- [ ] **P0** Logo, tên hiển thị, slogan, màu thương hiệu của Công ty T
- [ ] **P0** Thông tin liên hệ: hotline, email, địa chỉ, Zalo OA ID, giờ làm việc
- [ ] **P0** Danh sách ngành và mẫu muốn có trong đợt đầu (chốt bảng ở PROJECT.md §3.3)
- [ ] **P1** Danh sách khách hàng tiêu biểu: logo, ngành, ảnh app, testimonial (xin phép khách)
- [ ] **P1** Bảng giá các gói và ưu đãi hiện tại (nội dung, thời hạn)
- [ ] **P1** Số liệu nổi bật: số app đã làm, số khách, số ngành...
- [ ] **P0** Tạo Mini App trên mini.zalo.me, lấy App ID, cập nhật `app-config.json` (title = tên Công ty T)

## Giai đoạn 1: Nền tảng
- [ ] **P0** Dọn template blank: xoá `clock.tsx`, nội dung "Hello world" ở `src/pages/index.tsx`
- [ ] **P0** Tạo cấu trúc thư mục `data/`, `templates/`, `hooks/`, `components/showcase/`
- [ ] **P0** `hooks/useLaunchParams.ts`: đọc `mode`, `templateID` (không phân biệt hoa thường)
- [ ] **P0** Router trong `layout.tsx`:
  - [ ] `/` là Showcase
  - [ ] `/t/:templateID/*` là màn hình template
  - [ ] Lúc khởi động có `mode=Template` thì `navigate('/t/<id>', { replace: true })`
  - [ ] `templateID` sai thì hiện thông báo và quay về `/`
- [ ] **P0** `data/templates.ts`: interface `TemplateMeta`, registry, lazy-load
- [ ] **P0** `data/company.ts`: thông tin công ty, ưu đãi, khách hàng, bảng giá
- [ ] **P0** Theme Tailwind: màu thương hiệu, font
- [ ] **P0** Kiểm tra trên **điện thoại thật** việc mở link `zalo.me/s/<APP_ID>/?mode=Template&templateID=...` và QR, xác nhận đọc được tham số

## Giai đoạn 2: Trang chủ Showcase
- [ ] **P0** Hero: logo, slogan, nút "Xem tất cả demo" và "Tư vấn ngay"
- [ ] **P0** FilterBar: chip ngành cuộn ngang, có "Tất cả"
- [ ] **P0** TemplateCard: thumbnail, mã + tên, nhãn ngành, nút "Xem demo"
- [ ] **P0** Lưới danh sách demo, lọc theo ngành, bộ đếm "N mẫu"
- [ ] **P1** Ô tìm kiếm theo tên mẫu
- [ ] **P1** Section "Cách hoạt động" (3 bước)
- [ ] **P1** Section số liệu nổi bật
- [ ] **P1** Section khách hàng tiêu biểu và testimonial (carousel)
- [ ] **P1** Section ưu đãi / bảng giá
- [ ] **P0** Section thông tin công ty và liên hệ: gọi (`openPhone`), chat OA (`openChat`)
- [ ] **P1** Form đăng ký tư vấn: tên, SĐT, ngành, mẫu quan tâm, ghi chú. Gửi về đâu? (chọn Google Sheet, webhook hoặc OA)
- [ ] **P2** Theo dõi OA (`followOA`)

## Giai đoạn 3: Khung template
- [ ] **P0** `pages/template.tsx`: tra registry, lazy-load, hiện skeleton khi đang tải
- [ ] **P0** `DemoBar` nổi, thu gọn được: "Bản demo" · "Tư vấn mẫu này" · "Xem mẫu khác"
- [ ] **P0** Helper `demoAction()`: popup "Đây là bản demo..." cho mọi hành động thật
- [ ] **P1** Nút chia sẻ (`openShareSheet`) với link kèm `templateID`
- [ ] **P1** Mỗi template có `theme.ts` riêng, không ảnh hưởng style Showcase (scope CSS theo class gốc)
- [ ] **P2** Sinh QR cho từng mẫu (để sales in hoặc gửi) bằng script đọc registry

## Giai đoạn 4: Xây các mẫu demo
Mỗi mẫu gồm thumbnail, mock-data, các màn hình chính, đăng ký vào registry, và đã test link `mode=Template`.

- [ ] **P0** `thoi_trang_01`: Shop thời trang (Home, danh mục, chi tiết SP size/màu, giỏ hàng, tài khoản)
- [ ] **P0** `fnb_cafe_01`: Quán cà phê (menu, tuỳ chọn món, giỏ, đặt mang đi / tại bàn)
- [ ] **P0** `spa_01`: Spa / Salon (dịch vụ, đặt lịch, chọn nhân viên)
- [ ] **P1** `fnb_nha_hang_01`: Nhà hàng (menu, đặt bàn)
- [ ] **P1** `sieu_thi_01`: Siêu thị mini
- [ ] **P1** `me_va_be_01`: Shop mẹ & bé
- [ ] **P1** `phong_kham_01`: Phòng khám (đặt lịch khám)
- [ ] **P2** `truong_hoc_01`: Trường học
- [ ] **P2** `khach_san_01`: Khách sạn
- [ ] **P2** `bat_dong_san_01`: Bất động sản
- [ ] **P2** `co_quan_01`: UBND / Sở ban ngành
- [x] **P2** `qua_tang_01`: Tiệm quà tặng (quà theo dịp, gói quà, viết thiệp)
- [x] **P2** `do_theu_01`: Order đồ thêu (tuỳ biến + xem trước, tiến độ đơn)
- [x] **P2** `thue_trang_phuc_01`: Cho thuê trang phục (ngày thuê, tính cọc)
- [x] **P2** `bida_01`: Quán bida (sơ đồ bàn, đặt bàn, gọi đồ)
- [ ] **P1** Tách component dùng chung giữa các mẫu (ProductCard, CartSheet, BookingCalendar...) vào `src/templates/_shared/`

## Giai đoạn 5: Hoàn thiện và phát hành
- [ ] **P0** Tối ưu ảnh (WebP, kích thước phù hợp) và kiểm tra dung lượng bundle so với giới hạn của Zalo
- [ ] **P0** Test trên Android và iOS: safe area, dark mode, nút back của Zalo trong template
- [ ] **P0** Kiểm tra mọi `templateID` trong registry mở đúng qua link
- [ ] **P1** Trang 404 / mẫu không tồn tại
- [ ] **P1** Cập nhật `README.md`: cách thêm một template mới (checklist)
- [ ] **P0** `npm run build`, `zmp deploy`, gửi duyệt trên mini.zalo.me
- [ ] **P1** Lập bảng link và QR từng mẫu cho đội sales

## Việc để sau (P2)
- [ ] Đưa nội dung công ty, ưu đãi, danh sách mẫu ra API hoặc Google Sheet (sửa không cần deploy)
- [ ] Thống kê lượt xem từng mẫu (analytics) để biết khách quan tâm ngành nào
- [ ] Đa ngôn ngữ (VI/EN)
- [ ] Cho khách đổi nhanh màu hoặc logo trong demo ("xem thử với thương hiệu của bạn")

## Câu hỏi cần chốt
- [ ] Form tư vấn gửi dữ liệu về đâu?
- [ ] Có dùng ảnh thật của khách hàng tiêu biểu không (cần xin phép)?
- [ ] Danh sách ngành cuối cùng và thứ tự ưu tiên làm mẫu?
- [ ] Ưu đãi có thời hạn không, có cần tự ẩn khi hết hạn không?
