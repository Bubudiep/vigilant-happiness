# customer-app

Chứa các Zalo Mini App reMini viết riêng cho từng khách hàng (mỗi khách một thư mục con, độc lập).

```
customer-app/
  <slug-khach>/      # VD: studio-abc — một project Zalo Mini App đầy đủ (app-config.json, package.json, src/…)
```

Quy ước:
- Tên thư mục = `slug` của gian hàng (`Store.slug`) để dễ đối chiếu với yêu cầu build ở `/controller/builds`.
- Mỗi app có `.env` riêng (`APP_ID`, `ZMP_TOKEN`, `VITE_API_URL`…) — **không commit** `.env`.
- Mẫu khởi đầu: sao chép từ `demo-mini-app-store/` (chỉ lấy mẫu cần dùng trong `src/templates/`).
- Không deploy nếu chưa được yêu cầu.
