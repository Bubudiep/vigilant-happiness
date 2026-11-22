import { appConfig } from "@/config";

import { getValidAccessToken } from "./auth";

export interface LeadInput {
  name: string;
  phone: string;
  industry?: string;
  note?: string;
  templateId?: string;
  /** "callback" = đặt lịch để reMini gọi lại */
  requestType?: "consultation" | "callback";
  /** YYYY-MM-DD */
  callbackDate?: string;
  callbackSlot?: string;
  /** Chống spam */
  formToken?: string;
  website?: string;
}

/** Phải khớp CALLBACK_SLOTS ở backend (leads/dto/create-lead.dto.ts). */
export const CALLBACK_SLOTS = ["08:00-10:00", "10:00-12:00", "13:30-15:30", "15:30-17:30", "19:00-21:00"];

export type LeadResult = { ok: true } | { ok: false; reason: "not_configured" | "invalid" | "network"; message?: string };

let lastViewedTemplate: string | undefined;

/** Ghi nhận mẫu vừa xem, để form tư vấn biết khách quan tâm mẫu nào. */
export function rememberViewedTemplate(id: string) {
  lastViewedTemplate = id;
}

/**
 * Gửi yêu cầu tư vấn về backend (POST /api/leads).
 * Chưa cấu hình VITE_API_URL thì trả về `not_configured` để giao diện chuyển sang chat Zalo,
 * thay vì báo "đã gửi" trong khi dữ liệu không đi đâu cả.
 */
export async function submitLead(input: LeadInput): Promise<LeadResult> {
  if (!appConfig.apiUrl) return { ok: false, reason: "not_configured" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    // Đã đăng nhập Zalo → gửi kèm token để backend gắn tài khoản & xác minh SĐT
    const token = await getValidAccessToken();
    const res = await fetch(`${appConfig.apiUrl}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        name: input.name.trim(),
        phone: input.phone.replace(/\s+/g, ""),
        industry: input.industry || undefined,
        note: input.note?.trim() || undefined,
        templateId: input.templateId ?? lastViewedTemplate,
        requestType: input.requestType ?? "consultation",
        ...(input.requestType === "callback" ? { callbackDate: input.callbackDate, callbackSlot: input.callbackSlot } : {}),
        source: "zalo_mini_app",
        formToken: input.formToken,
        website: input.website,
      }),
      signal: controller.signal,
    });
    if (res.ok) return { ok: true };
    if (res.status === 429) return { ok: false, reason: "invalid", message: "Bạn đã gửi nhiều yêu cầu, vui lòng thử lại sau ít phút" };
    if (res.status === 400) {
      const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(body?.message) ? body?.message[0] : body?.message;
      return { ok: false, reason: "invalid", message };
    }
    return { ok: false, reason: "network" };
  } catch {
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timer);
  }
}
