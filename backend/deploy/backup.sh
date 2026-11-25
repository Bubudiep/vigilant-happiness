#!/usr/bin/env bash
# Sao lưu reMini: PostgreSQL (pg_dump) + uploads/ + uploads-private/ → mỗi lần chạy một "snapshot"
#   $BACKUP_DIR/<YYYYmmdd-HHMMSS>/{db.dump, uploads/, uploads-private/}
# Giữ KEEP snapshot mới nhất (mặc định 7). Thư mục ảnh dùng rsync --link-dest (hard link với snapshot trước)
# nên 7 bản chỉ tốn ~1 bản ảnh + phần ảnh mới thêm — quan trọng vì ổ VPS chỉ 40GB.
# Tuỳ chọn: đẩy ra ngoài VPS bằng rclone (đặt RCLONE_REMOTE).
#
# Cấu hình bằng biến môi trường (hoặc /etc/remini/backup.env khi chạy bằng systemd timer):
#   APP_DIR        thư mục backend/ (mặc định: thư mục cha của deploy/)
#   BACKUP_DIR     nơi lưu snapshot (mặc định /var/backups/remini)
#   KEEP           số snapshot giữ lại (mặc định 7)
#   RCLONE_REMOTE  VD gdrive:remini-backup — để trống = chỉ sao lưu trong VPS
#   PGHOST/PGUSER/PGDATABASE (mặc định 127.0.0.1 / remini / remini) + mật khẩu ở ~/.pgpass của user chạy script
#
# Thoát 0 = xong hết; 1 = lỗi sao lưu cục bộ (snapshot dở bị xoá); 2 = cục bộ xong nhưng đẩy rclone lỗi.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(dirname "$SCRIPT_DIR")}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/remini}"
KEEP="${KEEP:-7}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
export PGHOST="${PGHOST:-127.0.0.1}" PGUSER="${PGUSER:-remini}" PGDATABASE="${PGDATABASE:-remini}"
MIN_FREE_GB="${MIN_FREE_GB:-2}"

log() { echo "[backup $(date '+%F %T')] $*"; }

PARTIAL=""
on_error() {
  log "LỖI ở dòng $1 — huỷ snapshot dở"
  [[ -n "$PARTIAL" ]] && rm -rf "$PARTIAL"
  exit 1
}
trap 'on_error $LINENO' ERR

[[ "$KEEP" =~ ^[0-9]+$ && "$KEEP" -ge 1 ]] || { echo "KEEP phải là số nguyên ≥ 1" >&2; exit 1; }
[[ -d "$APP_DIR" ]] || { echo "Không thấy APP_DIR=$APP_DIR" >&2; exit 1; }
mkdir -p "$BACKUP_DIR"

# Không chạy chồng 2 lần
exec 9>"$BACKUP_DIR/.lock"
flock -n 9 || { log "Đang có một tiến trình sao lưu khác — thoát"; exit 1; }

free_gb=$(df --output=avail -BG "$BACKUP_DIR" | tail -1 | tr -dc '0-9')
if (( free_gb < MIN_FREE_GB )); then
  log "Chỉ còn ${free_gb}GB trống ở $BACKUP_DIR (< ${MIN_FREE_GB}GB) — dừng để không làm đầy ổ"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
PARTIAL="$BACKUP_DIR/.partial-$STAMP"
FINAL="$BACKUP_DIR/$STAMP"
mkdir -p "$PARTIAL"

# 1) Cơ sở dữ liệu (định dạng custom, đã nén; khôi phục bằng pg_restore)
log "pg_dump $PGDATABASE@$PGHOST ..."
pg_dump --format=custom --no-owner --file="$PARTIAL/db.dump" "$PGDATABASE"
pg_restore --list "$PARTIAL/db.dump" > /dev/null   # kiểm tra file đọc được
log "DB: $(du -h "$PARTIAL/db.dump" | cut -f1)"

# 2) Ảnh: rsync, hard link với snapshot gần nhất để không tốn thêm chỗ cho file không đổi
PREV="$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '[0-9]*-[0-9]*' | sort | tail -1)"
for d in uploads uploads-private; do
  [[ -d "$APP_DIR/$d" ]] || continue
  link=()
  [[ -n "$PREV" && -d "$PREV/$d" ]] && link=(--link-dest="$PREV/$d")
  log "rsync $d ..."
  # mã 24 = file biến mất giữa chừng (vừa bị xoá khi đang sao lưu) — chấp nhận được
  rsync -a --delete "${link[@]}" "$APP_DIR/$d/" "$PARTIAL/$d/" || [[ $? -eq 24 ]]
done

mv "$PARTIAL" "$FINAL"
PARTIAL=""
ln -sfn "$FINAL" "$BACKUP_DIR/latest"
log "Xong snapshot $FINAL"

# 3) Xoá snapshot cũ, chỉ giữ KEEP bản mới nhất; dọn snapshot dở của lần trước
mapfile -t snaps < <(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '[0-9]*-[0-9]*' | sort)
if (( ${#snaps[@]} > KEEP )); then
  for s in "${snaps[@]:0:${#snaps[@]}-KEEP}"; do
    log "Xoá snapshot cũ $s"
    rm -rf "$s"
  done
fi
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '.partial-*' -mtime +1 -exec rm -rf {} +

# 4) Đẩy ra ngoài VPS (tuỳ chọn) — lỗi ở đây không làm mất bản cục bộ nhưng trả mã 2 để systemd báo failed
offsite() {
  rclone copyto "$FINAL/db.dump" "$RCLONE_REMOTE/db/db-$STAMP.dump" || return 1
  for d in uploads uploads-private; do
    [[ -d "$FINAL/$d" ]] || continue
    # Bản sao gương; file bị xoá/ghi đè ở nguồn được giữ 30 ngày ở _deleted/ phòng xoá nhầm
    rclone sync "$FINAL/$d/" "$RCLONE_REMOTE/$d/" --backup-dir "$RCLONE_REMOTE/_deleted/$STAMP/$d" || return 1
  done
  rclone delete "$RCLONE_REMOTE/db" --min-age "${KEEP}d" || return 1
  rclone delete "$RCLONE_REMOTE/_deleted" --min-age 30d || return 1
}

offsite_fail=0
if [[ -n "$RCLONE_REMOTE" ]]; then
  if ! command -v rclone > /dev/null; then
    log "RCLONE_REMOTE đã đặt nhưng chưa cài rclone"
    offsite_fail=1
  else
    log "rclone → $RCLONE_REMOTE ..."
    offsite || { log "rclone LỖI — bản cục bộ vẫn an toàn"; offsite_fail=1; }
  fi
fi

(( offsite_fail )) && exit 2
log "Hoàn tất."
