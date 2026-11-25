-- Thêm 2 gói dịch vụ: Free và Bắt đầu (99.000đ/tháng). Đã có gói cùng mã thì giữ nguyên (sửa ở Trang điều hành → Gói dịch vụ).
INSERT INTO "SubscriptionPlan" ("id", "code", "name", "description", "priceMonthly", "priceYearly", "maxStores", "maxProducts", "maxStaff", "storageQuotaMb", "features", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('plan_free', 'free', 'Free', 'Dùng thử miễn phí: 1 Mini App giao diện mẫu, giới hạn sản phẩm & dung lượng.', 0, 0, 1, 20, 2, 200,
   '["1 Mini App (giao diện mẫu)", "20 sản phẩm / dịch vụ", "2 nhân sự", "200MB ảnh", "Tích điểm & voucher cơ bản"]'::jsonb, true, -2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_starter', 'starter', 'Bắt đầu', 'Cho quán nhỏ mới bắt đầu bán trên Zalo.', 99000, 990000, 1, 100, 5, 1024,
   '["1 Mini App", "100 sản phẩm / dịch vụ", "5 nhân sự", "1GB ảnh", "Bán hàng tại quầy & báo cáo"]'::jsonb, true, -1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
