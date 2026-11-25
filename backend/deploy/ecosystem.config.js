// PM2 — chạy API reMini trên VPS 2 CPU / 4GB RAM (AlmaLinux 9).
//   cd /opt/remini/app/backend && npm run build
//   pm2 start deploy/ecosystem.config.js && pm2 save
//
// Chỉ chạy 1 instance (fork, KHÔNG cluster): các cron trong src/jobs (nhắc lịch, cảnh báo ổ, dọn dữ liệu)
// sẽ chạy trùng nếu có nhiều instance. 1 tiến trình Node đủ cho quy mô này; 2 CPU còn lại dành cho
// PostgreSQL / Nginx / sharp (nén ảnh album).
module.exports = {
  apps: [
    {
      name: "remini-api",
      // nest build ra dist/src/main.js (không phải dist/main.js)
      script: "dist/src/main.js",
      cwd: __dirname + "/..", // backend/ — Nest đọc .env và uploads/ theo thư mục này
      instances: 1,
      exec_mode: "fork",
      // RAM 4GB: PostgreSQL ~0,7–1GB, Nginx + OS ~0,5GB → API được ~1,5GB gồm cả bộ nhớ native của sharp/libvips
      // (nằm ngoài heap V8). Vượt ngưỡng → PM2 khởi động lại sạch thay vì để kernel OOM-kill cả PostgreSQL.
      max_memory_restart: "1500M",
      node_args: "--max-old-space-size=768",
      env: {
        NODE_ENV: "production",
        // glibc cấp phát nhiều "arena" theo số luồng làm bộ nhớ sharp phình dần; 2 arena là đủ cho 2 CPU
        MALLOC_ARENA_MAX: "2",
      },
      // Không khởi động lại liên tục khi lỗi cấu hình (VD thiếu JWT_SECRET) — dừng sau 10 lần
      min_uptime: "30s",
      max_restarts: 10,
      restart_delay: 3000,
      // Cho request đang xử lý (nén ảnh, upload) kịp xong khi reload / stop
      kill_timeout: 15000,
      time: true, // thêm timestamp vào log
      merge_logs: true,
      // Log ở ~/.pm2/logs/ — nên cài pm2-logrotate (xem README)
    },
  ],
};
