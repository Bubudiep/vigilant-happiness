# Hướng dẫn cho AI coding agent

Đọc trước khi làm: [PROJECT.md](./PROJECT.md) (kiến trúc, phân quyền, lệnh chạy, quy ước) và
[TASKS.md](./TASKS.md) (việc đã xong, việc tiếp theo T1…T13 có file liên quan & tiêu chí xong).

- 3 project độc lập: `demo-mini-app-store/` (Zalo Mini App, chỉ demo & tiếp thị), `frontend/` (web quản trị), `backend/` (NestJS + Prisma).
- Trả lời người dùng bằng tiếng Việt. Giao diện & comment tiếng Việt.
- Sau khi sửa: typecheck + build project bị ảnh hưởng (lệnh ở PROJECT.md §7). Backend dev thường đang chạy `nest start --watch` ở cổng 4000 — kiểm tra API bằng curl.
- Đổi schema Prisma: tạo migration bằng `prisma migrate diff` (PROJECT.md §5), không dùng `db push`.
- Không in / commit giá trị trong `.env`. Không deploy Mini App nếu người dùng chưa yêu cầu.
- Cập nhật TASKS.md khi xong một việc.
