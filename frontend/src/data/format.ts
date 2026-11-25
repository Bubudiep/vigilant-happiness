/** Định dạng số byte → "1.5 MB". */
export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${u[i]}`;
}

/** Hạn mức theo MB: từ 1024 MB hiện theo GB; null/thiếu = không giới hạn. */
export function fmtQuotaMb(mb: number | null | undefined): string {
  if (mb == null) return "không giới hạn";
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
}
