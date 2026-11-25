#!/usr/bin/env bash
# Cập nhật cả backend + web quản trị trên VPS (AlmaLinux).
# Repo trên VPS: /var/www/html/vigilant-happiness
# Chạy ở thư mục gốc repo:  bash deploy.sh            (đủ các bước)
#                            bash deploy.sh --backend  (chỉ backend)
#                            bash deploy.sh --frontend (chỉ web quản trị)
#                            bash deploy.sh --no-pull  (không git pull, dùng code đang có)
#
# Biến môi trường tuỳ chọn:
#   WEB_ROOT=<thư mục>             nơi Nginx phục vụ web quản trị. Mặc định = frontend/dist trong repo
#                                  (build ra thư mục tạm rồi đổi tên → không có lúc trang trắng).
#                                  Thư mục khác (VD /var/www/remini-web) → build xong rsync --delete sang đó.
#                                  KHÔNG được là thư mục repo hay thư mục cha của repo (sẽ bị chặn).
#   SKIP_BACKUP=1                  bỏ sao lưu trước khi cập nhật
#   HEALTH_URL=http://127.0.0.1:4000/api/health
#
# Mini App (demo-mini-app-store) KHÔNG deploy ở đây — chạy zmp-cli trên máy dev.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="${WEB_ROOT:-$ROOT/frontend/dist}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:4000/api/health}"

DO_BACKEND=1
DO_FRONTEND=1
DO_PULL=1
for arg in "$@"; do
  case "$arg" in
    --backend) DO_FRONTEND=0 ;;
    --frontend) DO_BACKEND=0 ;;
    --no-pull) DO_PULL=0 ;;
    -h|--help) awk 'NR>1 && /^#/ {sub(/^# ?/,""); print; next} NR>1 {exit}' "$0"; exit 0 ;;
    *) echo "Tham số không hợp lệ: $arg (xem --help)"; exit 1 ;;
  esac
done

step() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m✖ %s\033[0m\n' "$*"; exit 1; }
trap 'fail "Lỗi ở dòng $LINENO — dừng cập nhật (bản đang chạy chưa bị thay nếu lỗi trước bước reload)."' ERR

# Chạy bằng user sở hữu repo để file build không đổi chủ
OWNER=$(stat -c %U "$ROOT")
if [ "$(id -un)" != "$OWNER" ]; then
  echo "⚠ Đang chạy bằng $(id -un) nhưng repo thuộc $OWNER — file mới sẽ thuộc $(id -un)."
fi
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

# An toàn: rsync --delete vào repo (hoặc thư mục cha của repo) sẽ xoá sạch code, .env, uploads/
WEB_REAL=$(realpath -m "$WEB_ROOT")
ROOT_REAL=$(realpath -m "$ROOT")
case "$ROOT_REAL/" in
  "$WEB_REAL"/*) fail "WEB_ROOT=$WEB_ROOT là repo hoặc thư mục cha của repo — rsync --delete sẽ xoá cả repo. Dùng frontend/dist (mặc định) hoặc thư mục riêng." ;;
esac
[ "$WEB_REAL" = "/" ] && fail "WEB_ROOT không được là /"

# Chặn 2 lần chạy cùng lúc
exec 9>"/tmp/remini-deploy.lock"
flock -n 9 || fail "Đang có một lần deploy khác chạy."

START=$(date +%s)
cd "$ROOT"

# ── 1. Sao lưu ─────────────────────────────────────────────────────────────
if [ "$DO_BACKEND" = 1 ] && [ "${SKIP_BACKUP:-0}" != 1 ]; then
  step "Sao lưu DB + ảnh trước khi cập nhật"
  if [ -f /etc/remini/backup.env ] || [ -n "${BACKUP_DIR:-}" ]; then
    [ -f /etc/remini/backup.env ] && set -a && . /etc/remini/backup.env && set +a
    bash backend/deploy/backup.sh
  else
    echo "  (bỏ qua — chưa cấu hình sao lưu: tạo /etc/remini/backup.env theo backend/deploy/README.md §10)"
  fi
fi

# ── 2. Lấy code mới ────────────────────────────────────────────────────────
if [ "$DO_PULL" = 1 ]; then
  step "git pull"
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    git status --short --untracked-files=no
    fail "Có file đã sửa trực tiếp trên server — commit/stash trước rồi chạy lại."
  fi
  BEFORE=$(git rev-parse --short HEAD)
  git pull --ff-only
  AFTER=$(git rev-parse --short HEAD)
  if [ "$BEFORE" = "$AFTER" ]; then echo "  Đã là bản mới nhất ($AFTER)"; else git log --oneline "$BEFORE..$AFTER"; fi
fi

# ── 3. Backend ─────────────────────────────────────────────────────────────
if [ "$DO_BACKEND" = 1 ]; then
  cd "$ROOT/backend"
  [ -f .env ] || fail "Thiếu backend/.env"

  step "Backend: cài thư viện (npm ci, có devDependencies cho script storage:* / seed)"
  npm ci --no-audit --no-fund

  step "Backend: migrate DB"
  npx prisma migrate deploy

  step "Backend: build"
  npm run build
  [ -f dist/src/main.js ] || fail "Build xong nhưng không thấy dist/src/main.js"

  step "Backend: reload PM2"
  if pm2 describe remini-api >/dev/null 2>&1; then
    # Tiến trình cũ có thể đang trỏ dist/main.js (sai) → khởi động lại theo ecosystem
    if pm2 describe remini-api | grep -q "dist/src/main.js"; then
      pm2 reload deploy/ecosystem.config.js --update-env
    else
      echo "  Tiến trình remini-api đang chạy file cũ → tạo lại theo deploy/ecosystem.config.js"
      pm2 delete remini-api
      pm2 start deploy/ecosystem.config.js
    fi
  else
    pm2 start deploy/ecosystem.config.js
  fi
  pm2 save >/dev/null

  step "Backend: kiểm tra $HEALTH_URL"
  ok=0
  for _ in $(seq 1 20); do
    if curl -fsS -m 3 "$HEALTH_URL" >/dev/null 2>&1; then ok=1; break; fi
    sleep 2
  done
  [ "$ok" = 1 ] || { pm2 logs remini-api --lines 40 --nostream || true; fail "API không trả lời sau 40 giây"; }
  echo "  API OK"
  cd "$ROOT"
fi

# ── 4. Frontend ────────────────────────────────────────────────────────────
if [ "$DO_FRONTEND" = 1 ]; then
  cd "$ROOT/frontend"
  [ -f .env.production ] || [ -f .env ] || echo "  ⚠ Không thấy frontend/.env.production — VITE_API_URL có thể sai"

  step "Frontend: cài thư viện + kiểm tra kiểu"
  npm ci --no-audit --no-fund
  npx tsc -b

  step "Frontend: build (thư mục tạm)"
  rm -rf dist.new
  npx vite build --outDir dist.new --emptyOutDir
  [ -f dist.new/index.html ] || fail "Build frontend không ra index.html"

  if [ "$(realpath -m "$WEB_ROOT")" = "$(realpath -m "$ROOT/frontend/dist")" ]; then
    step "Frontend: thay frontend/dist (Nginx phục vụ thẳng từ repo)"
    rm -rf dist.old
    [ -d dist ] && mv dist dist.old
    mv dist.new dist
    rm -rf dist.old
  else
    step "Frontend: chép sang $WEB_ROOT"
    $SUDO mkdir -p "$WEB_ROOT"
    $SUDO rsync -a --delete dist.new/ "$WEB_ROOT/"
    rm -rf dist.new
  fi
  command -v restorecon >/dev/null && $SUDO restorecon -R "$WEB_ROOT" || true
  cd "$ROOT"
fi

printf '\n\033[1;32m✔ Xong sau %ss — bản %s\033[0m\n' "$(( $(date +%s) - START ))" "$(git rev-parse --short HEAD)"
