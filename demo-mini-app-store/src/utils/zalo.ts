import { openChat, openPhone } from "zmp-sdk";

import { company } from "@/data/company";

/** Gọi hotline Công ty T. */
export async function callCompany() {
  try {
    await openPhone({ phoneNumber: company.phone });
  } catch {
    window.location.href = `tel:${company.phone}`;
  }
}

/** Mở chat với Zalo OA của Công ty T (nếu chưa cấu hình OA thì gọi điện). */
export async function chatWithCompany(message?: string) {
  if (!company.zaloOaId) return callCompany();
  try {
    await openChat({ type: "oa", id: company.zaloOaId, message });
  } catch {
    return callCompany();
  }
}

// Chia sẻ: xem src/utils/share.ts (shareTemplate, shareApp, shareReferral, copyText)
