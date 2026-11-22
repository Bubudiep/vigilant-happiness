/**
 * REGISTRY các mẫu demo.
 *
 * Thêm mẫu mới:
 *   1. Tạo thư mục src/templates/<templateId>/ (copy cấu trúc của một mẫu có sẵn, VD fnb_cafe_01)
 *   2. Export `meta: TemplateMeta` từ src/templates/<templateId>/index.ts
 *   3. Import và thêm vào mảng `templates` bên dưới
 *
 * Mẫu chưa làm xong: khai báo meta với status "coming_soon" (không cần routes) → hiện "Sắp ra mắt".
 */
import type { TemplateMeta } from "./types";

import batDongSan01 from "./bat_dong_san_01";
import bida01 from "./bida_01";
import catToc01 from "./cat_toc_01";
import coQuan01 from "./co_quan_01";
import congChung01 from "./cong_chung_01";
import doTheu01 from "./do_theu_01";
import fnbCafe01 from "./fnb_cafe_01";
import fnbNhaHang01 from "./fnb_nha_hang_01";
import kcnDoanhNghiep01 from "./kcn_doanh_nghiep_01";
import khachSan01 from "./khach_san_01";
import meVaBe01 from "./me_va_be_01";
import nail01 from "./nail_01";
import mixue01 from "./mixue_01";
import phongKham01 from "./phong_kham_01";
import quaTang01 from "./qua_tang_01";
import sieuAm5d01 from "./sieu_am_5d_01";
import sieuThi01 from "./sieu_thi_01";
import spa01 from "./spa_01";
import spa02 from "./spa_02";
import thoiTrang01 from "./thoi_trang_01";
import tiemNet01 from "./tiem_net_01";
import thueTrangPhuc01 from "./thue_trang_phuc_01";
import truongHoc01 from "./truong_hoc_01";
import vanPhongLuat01 from "./van_phong_luat_01";

export const templates: TemplateMeta[] = [
  mixue01,
  thoiTrang01,
  fnbCafe01,
  spa01,
  catToc01,
  nail01,
  spa02,
  tiemNet01,
  fnbNhaHang01,
  sieuThi01,
  meVaBe01,
  phongKham01,
  sieuAm5d01,
  congChung01,
  vanPhongLuat01,
  kcnDoanhNghiep01,
  truongHoc01,
  khachSan01,
  batDongSan01,
  coQuan01,
  quaTang01,
  doTheu01,
  thueTrangPhuc01,
  bida01,
];

export const liveTemplates = templates.filter((t) => t.status === "live" && t.routes?.length);

export function findTemplate(id?: string): TemplateMeta | undefined {
  if (!id) return undefined;
  const key = id.toLowerCase();
  return templates.find((t) => t.id === key);
}

export function findLiveTemplate(id?: string): TemplateMeta | undefined {
  const t = findTemplate(id);
  return t && t.status === "live" && t.routes?.length ? t : undefined;
}

export type { TemplateMeta } from "./types";
