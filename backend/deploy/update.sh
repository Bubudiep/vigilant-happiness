#!/usr/bin/env bash
# Cập nhật bản mới trên VPS (chạy bằng user `remini`):  bash deploy/update.sh
# git pull → cài thư viện → migrate DB → build → reload API. Frontend: build + copy riêng (xem README §8).
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."          # backend/

echo "▶ Sao lưu nhanh trước khi cập nhật"
bash deploy/backup.sh

echo "▶ Lấy code mới"
git -C .. pull --ff-only

echo "▶ Thư viện + Prisma"
npm ci
npx prisma migrate deploy

echo "▶ Build"
npm run build

echo "▶ Reload API"
pm2 reload deploy/ecosystem.config.js --update-env || pm2 start deploy/ecosystem.config.js
pm2 save

sleep 3
curl -fsS http://127.0.0.1:4000/api/health && echo
