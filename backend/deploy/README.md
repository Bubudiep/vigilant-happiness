# Triển khai reMini lên VPS AlmaLinux 9

Mục tiêu: VPS **2 CPU / 4GB RAM / 40GB NVMe** chạy PostgreSQL + API (NestJS, PM2) + web quản trị (Nginx, HTTPS), có sao lưu hằng đêm.
Làm theo thứ tự từ §1; mỗi bước có lệnh kiểm tra. Ứng với việc **B4–B6** trong `TASKS.md`.

> Ví dụ dùng tên miền `recloud.vn` (web) và `api.recloud.vn` (API), user hệ thống `remini`, mã nguồn ở `/opt/remini/app`
> (có `backend/`, `frontend/`). Đổi theo thực tế. Lệnh có `sudo` chạy bằng user có quyền sudo; lệnh còn lại chạy bằng user `remini`.
> Các file trong thư mục này **chưa được thử trên AlmaLinux thật** — nếu một bước lệch, kiểm tra lại theo thông báo lỗi.

| File | Dùng cho |
|---|---|
| `nginx.conf` | `/etc/nginx/conf.d/remini.conf` (§7) |
| `ecosystem.config.js` | PM2 (§6) |
| `backup.sh`, `remini-backup.service`, `remini-backup.timer` | Sao lưu hằng đêm (§10) |
| `update.sh` | Cập nhật bản mới (§11) |

## 0. Ổ 40GB là giới hạn chính

Ảnh khách tải lên (album + ảnh sản phẩm) sẽ chiếm phần lớn ổ. Nên làm đủ 3 việc:
1. Đặt **hạn mức dung lượng theo gói** (trang Gói dịch vụ) — chặn shop dùng vượt gói (T31).
2. Có cảnh báo: API tự báo Telegram / webhook khi ổ ≥ 80% và ≥ 90% (cần `TELEGRAM_*` hoặc `NOTIFY_WEBHOOK_URL` trong `.env`).
3. Chạy `storage:orphans` hằng tuần (§9) và sao lưu ra ngoài VPS bằng rclone (§10).

## 1. Hệ thống

```bash
sudo dnf -y update
sudo dnf -y install git curl openssl rsync tar policycoreutils-python-utils
sudo timedatectl set-timezone Asia/Ho_Chi_Minh

# Tạo user chạy ứng dụng
sudo useradd -m -s /bin/bash remini
sudo mkdir -p /opt/remini /var/www/remini-web /var/backups/remini /etc/remini
sudo chown -R remini:remini /opt/remini /var/backups/remini

# Swap 2GB — RAM 4GB đủ chạy, nhưng build frontend / nén ảnh hàng loạt có lúc tăng đột biến
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/90-swap.conf && sudo sysctl --system
```

### Tường lửa (firewalld)

Chỉ mở SSH, HTTP, HTTPS. **Không** mở 4000 (API) và 5432 (PostgreSQL) — chỉ Nginx nói chuyện với API qua localhost.

```bash
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=ssh --add-service=http --add-service=https
sudo firewall-cmd --reload
sudo firewall-cmd --list-all        # chỉ thấy ssh http https
```

### SELinux

Giữ chế độ **Enforcing** (`getenforce`). Hai chỗ cần chỉnh (làm ở §7):
- `httpd_can_network_connect` — cho Nginx chuyển tiếp request tới API ở `127.0.0.1:4000` (thiếu → lỗi **502 Bad Gateway**).
- Nhãn `httpd_sys_content_t` cho thư mục web `/var/www/remini-web`.

Khi gặp lỗi lạ nghi do SELinux: `sudo ausearch -m avc -ts recent` (đừng tắt SELinux).

## 2. Node.js LTS

```bash
sudo dnf module list nodejs          # xem các stream có sẵn
sudo dnf module enable -y nodejs:22  # hoặc stream LTS mới nhất mà Prisma 5 / sharp 0.34 hỗ trợ (Node ≥ 20)
sudo dnf install -y nodejs npm
node -v && npm -v
```

Nếu AppStream chưa có stream mong muốn: dùng NodeSource (`curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -` rồi `sudo dnf install -y nodejs`).

## 3. PostgreSQL

```bash
sudo dnf module enable -y postgresql:16
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

Tạo user + database (đổi mật khẩu — dùng chuỗi ngẫu nhiên dài, tránh ký tự `@ : / ? #` để ghép vào `DATABASE_URL` khỏi phải mã hoá):

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE remini LOGIN PASSWORD 'ĐỔI_MẬT_KHẨU';
CREATE DATABASE remini OWNER remini ENCODING 'UTF8';
SQL
```

Đăng nhập bằng mật khẩu qua `127.0.0.1`: mở `/var/lib/pgsql/data/pg_hba.conf`, đổi phương thức của 2 dòng `host ... 127.0.0.1/32` và `::1/128` từ `ident` thành `scram-sha-256`, giữ `listen_addresses = 'localhost'` (mặc định). Rồi chỉnh bộ nhớ cho VPS 4GB trong `/var/lib/pgsql/data/postgresql.conf`:

```
shared_buffers = 512MB
effective_cache_size = 1536MB
work_mem = 8MB
maintenance_work_mem = 128MB
max_connections = 50
```

```bash
sudo systemctl restart postgresql
PGPASSWORD='ĐỔI_MẬT_KHẨU' psql -h 127.0.0.1 -U remini remini -c 'select 1'    # kiểm tra
```

## 4. Mã nguồn + cấu hình `backend/.env` (B5)

```bash
sudo -iu remini
cd /opt/remini && git clone <URL repo> app && cd app/backend
cp .env.example .env && chmod 600 .env && nano .env
```

Các biến bắt buộc/quan trọng khi chạy thật (danh sách đầy đủ ở `.env.example`):

| Biến | Giá trị |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `DATABASE_URL` | `postgresql://remini:<mật khẩu>@127.0.0.1:5432/remini?schema=public` |
| `JWT_SECRET` | chuỗi mới, ≥ 16 ký tự: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_API_KEY`, `ANTISPAM_SECRET` | chuỗi ngẫu nhiên riêng |
| `ADMIN_EMAILS` | email Google của quản trị viên đầu tiên |
| `PUBLIC_API_ORIGIN` | `https://api.recloud.vn` (dùng tạo URL ảnh — đặt sai thì ảnh hỏng link) |
| `FRONTEND_URL` | `https://recloud.vn` |
| `CORS_ORIGINS` | `https://recloud.vn` |
| `TRUST_PROXY` | `1` (đã có Nginx đứng trước) |
| `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` | callback `https://api.recloud.vn/api/auth/google/callback` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | để nhận cảnh báo (lead mới, ổ đầy…) |

Không commit / dán `.env` lên chat hay log.

## 5. Cài thư viện, migrate DB, build (B6)

```bash
cd /opt/remini/app/backend
npm ci                                  # cài cả devDependencies — xem ghi chú bên dưới
npx prisma migrate deploy
npm run prisma:seed                     # CHỈ lần cài đầu (dữ liệu mẫu: gói, OAuth client của Mini App...)
npm run build                           # ra dist/src/main.js
mkdir -p uploads uploads-private
```

> **Vì sao giữ devDependencies trên VPS:** các lệnh bảo trì (`npm run storage:*`, `prisma:seed`) chạy bằng `ts-node` — thư viện này nằm ở devDependencies.
> Cài đủ (~vài trăm MB) đơn giản và ít sai hơn so với biên dịch riêng từng script; ổ 40GB vẫn dư. Nếu muốn gọn, dùng `npm ci --omit=dev` và chạy bản đã build:
> `node dist/scripts/storage-orphans.js` (script nằm trong `dist/scripts/` sau `npm run build`), nhưng `prisma:seed` thì không còn.

## 6. PM2 (API)

```bash
sudo npm install -g pm2
pm2 install pm2-logrotate               # xoay vòng log, tránh đầy ổ
pm2 start deploy/ecosystem.config.js    # 1 instance, tự restart khi vượt 1,5GB RAM
pm2 save
pm2 startup systemd -u remini --hp /home/remini   # in ra 1 lệnh `sudo env PATH=... pm2 startup ...` → copy chạy bằng sudo
curl -s http://127.0.0.1:4000/api/health          # {"status":"ok",...,"database":"connected"}
```

Xem log: `pm2 logs remini-api`. Chỉ chạy **1 instance** (cron nội bộ sẽ chạy trùng nếu cluster).

## 7. Nginx + SELinux

```bash
sudo dnf install -y nginx
sudo systemctl enable nginx
sudo cp /opt/remini/app/backend/deploy/nginx.conf /etc/nginx/conf.d/remini.conf
sudo nano /etc/nginx/conf.d/remini.conf         # đổi recloud.vn / api.recloud.vn nếu dùng tên miền khác
# Bỏ khối `server { ... }` mặc định (listen 80 default_server) trong /etc/nginx/nginx.conf nếu thấy vướng

# SELinux
sudo setsebool -P httpd_can_network_connect 1
sudo semanage fcontext -a -t httpd_sys_content_t "/var/www/remini-web(/.*)?"
sudo restorecon -Rv /var/www/remini-web

sudo nginx -t && sudo systemctl start nginx
```

Trỏ DNS `recloud.vn`, `www`, `api` về IP VPS **trước** khi xin chứng chỉ. Cấu hình mẫu đã có sẵn:
`client_max_body_size 50m`, gzip, cache ảnh công khai `/uploads/` (Nginx 7 ngày + trình duyệt 30 ngày; tên file không bao giờ bị ghi đè nên an toàn), header `X-Forwarded-For` đúng với `TRUST_PROXY=1`.

> Giới hạn **50MB / request**: album cho tải tối đa 30 ảnh × 10MB, nên giao diện cần chia lô tải lên ≤ ~45MB mỗi request, nếu không Nginx trả 413 (không kèm JSON). Cần nâng giới hạn thì sửa `client_max_body_size`.

## 8. Web quản trị (frontend)

Build trên máy dev rồi chép lên là nhẹ nhất cho VPS; hoặc build ngay trên VPS (cần swap §1):

```bash
cd /opt/remini/app/frontend
echo 'VITE_API_URL=https://api.recloud.vn/api' > .env.production      # cùng các biến VITE_* khác nếu có
npm ci && npm run build
sudo rsync -a --delete dist/ /var/www/remini-web/
sudo restorecon -Rv /var/www/remini-web
```

## 9. HTTPS (certbot) + việc định kỳ

```bash
sudo dnf install -y epel-release
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d recloud.vn -d www.recloud.vn -d api.recloud.vn    # chọn chuyển hướng http→https
sudo systemctl enable --now certbot-renew.timer                            # gia hạn tự động
sudo certbot renew --dry-run
```

Cập nhật lại `.env` nếu cần (`PUBLIC_API_ORIGIN`, `FRONTEND_URL` phải là `https://...`) rồi `pm2 restart remini-api --update-env`.

**Dọn file mồ côi hằng tuần** (file ảnh không còn bản ghi — VD sau khi xoá dữ liệu; bản ghi mất file). Chạy thử trước để xem:

```bash
cd /opt/remini/app/backend && npm run storage:orphans        # dry-run, chỉ liệt kê
```

Rồi thêm cron cho user `remini` (`crontab -e`) — chủ nhật 04:00, file mới hơn 60 phút luôn được bỏ qua nên không xoá nhầm ảnh đang tải lên:

```
0 4 * * 0  cd /opt/remini/app/backend && /usr/bin/npm run -s storage:orphans -- --delete >> /home/remini/orphans.log 2>&1
```

Các lệnh bảo trì khác (chạy tay, ở `backend/`): `npm run storage:recompress` (nén lại ảnh album cũ + tạo thumbnail),
`npm run storage:inline-images` (dry-run; thêm `-- --apply` để chuyển ảnh base64 trong thiết kế ra file thật — sao lưu DB trước).

## 10. Sao lưu hằng đêm

`backup.sh` tạo snapshot `/var/backups/remini/<ngày-giờ>/` gồm `db.dump` (pg_dump định dạng custom) + `uploads/` + `uploads-private/`,
giữ 7 snapshot mới nhất. Ảnh dùng `rsync --link-dest` (hard link) nên 7 bản chỉ tốn gần bằng **1 bản** ảnh + ảnh mới thêm.
Sao lưu cùng ổ chỉ chống được xoá nhầm, **không chống hỏng ổ / mất VPS** → bật rclone ra ngoài.

```bash
# 1. Cho user remini đăng nhập PostgreSQL không cần gõ mật khẩu
sudo -iu remini
echo '127.0.0.1:5432:remini:remini:ĐỔI_MẬT_KHẨU' > ~/.pgpass && chmod 600 ~/.pgpass
bash /opt/remini/app/backend/deploy/backup.sh && ls /var/backups/remini/latest     # chạy thử 1 lần
exit

# 2. (Tuỳ chọn) đẩy ra ngoài VPS — Google Drive / S3 / Backblaze B2 / ...
sudo dnf install -y rclone                  # nếu thiếu: https://rclone.org/install/
sudo -iu remini rclone config               # tạo remote, VD tên `gdrive`
echo 'RCLONE_REMOTE=gdrive:remini-backup' | sudo tee /etc/remini/backup.env
# backup.env còn nhận KEEP=7, BACKUP_DIR=..., PGUSER=..., PGDATABASE=...

# 3. Bật timer systemd (02:30 mỗi đêm)
sudo cp /opt/remini/app/backend/deploy/remini-backup.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now remini-backup.timer
systemctl list-timers remini-backup.timer
sudo systemctl start remini-backup.service && journalctl -u remini-backup -n 30 --no-pager   # chạy thử qua systemd
```

Mã thoát của `backup.sh`: `0` xong; `1` lỗi sao lưu cục bộ (snapshot dở bị xoá); `2` cục bộ xong nhưng rclone lỗi — systemd đánh dấu `failed`
(xem `systemctl --failed`). Không dùng systemd thì dùng cron: `30 2 * * * bash /opt/remini/app/backend/deploy/backup.sh >> /home/remini/backup.log 2>&1`.

### Khôi phục

```bash
# DB (ghi đè dữ liệu hiện tại!) — dừng API trước
pm2 stop remini-api
pg_restore --clean --if-exists --no-owner -h 127.0.0.1 -U remini -d remini /var/backups/remini/latest/db.dump
# Ảnh
rsync -a /var/backups/remini/latest/uploads/ /opt/remini/app/backend/uploads/
rsync -a /var/backups/remini/latest/uploads-private/ /opt/remini/app/backend/uploads-private/
pm2 start remini-api
```

Nên **thử khôi phục vào DB phụ** một lần (`createdb remini_test && pg_restore -d remini_test ...`) để chắc bản sao lưu dùng được.

## 11. Cập nhật bản mới

```bash
sudo -iu remini
bash /opt/remini/app/backend/deploy/update.sh        # sao lưu → git pull → npm ci → migrate → build → pm2 reload
# frontend: build lại + rsync như §8
```

## 12. Kiểm tra sau khi cài

- [ ] `curl https://api.recloud.vn/api/health` → `database: connected`; `https://recloud.vn` mở được, đăng nhập Google OK.
- [ ] Tải 1 ảnh sản phẩm → URL `https://api.recloud.vn/uploads/...` mở được, lần 2 có header `X-Cache-Status: HIT`.
- [ ] Tải ảnh vào album → xem được qua URL ký; ảnh > 10MB bị từ chối; vượt hạn mức gói → 413 kèm thông báo.
- [ ] `pm2 status` online; reboot VPS → API tự lên (`pm2 startup`), Nginx / PostgreSQL tự lên.
- [ ] `systemctl list-timers` có `remini-backup.timer`, `certbot-renew.timer`; chạy thử backup 1 lần thành công; có file trên rclone (nếu bật).
- [ ] `sudo firewall-cmd --list-all` chỉ ssh/http/https; `ss -tlnp | grep -E '4000|5432'` chỉ nghe ở `127.0.0.1`.
- [ ] Cảnh báo ổ đầy: đã đặt `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (hoặc `NOTIFY_WEBHOOK_URL`); khi ổ ≥ 80% `pm2 logs remini-api` có dòng "Ổ đĩa đã dùng ..." và nhận được tin.
