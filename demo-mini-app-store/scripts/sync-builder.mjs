/**
 * Chép bộ render thiết kế (Miniapp Studio) từ web quản trị sang Mini App để hiện
 * đúng giao diện shop đã thiết kế khi mở link ?store=<slug>.
 *
 *   node scripts/sync-builder.mjs        (chạy lại mỗi khi sửa frontend/src/miniapp-builder/{blocks,icons,types})
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const from = resolve(root, "../frontend/src/miniapp-builder");
const to = resolve(root, "src/store-runtime/builder");
mkdirSync(to, { recursive: true });

const HEADER = "// ⚠️ Tự sinh từ frontend/src/miniapp-builder — đừng sửa ở đây, sửa bên frontend rồi chạy `node scripts/sync-builder.mjs`.\n";

for (const f of ["blocks.tsx", "icons.tsx", "types.ts"]) {
  let s = readFileSync(resolve(from, f), "utf8");
  // Ảnh mẫu: web dùng /stock/... cục bộ, Mini App lấy từ FRONTEND_URL (xem ../stock.ts)
  s = s.replace(`from "./stock-images";`, `from "../stock";`);
  writeFileSync(resolve(to, f), HEADER + s);
  console.log("✔", f);
}
