import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface ZaloProfile {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface GraphResponse {
  error?: number;
  message?: string;
}

/**
 * Gọi Zalo Graph API phía máy chủ.
 *
 * Lấy số điện thoại theo cách mới (từ 2023):
 *   1. Mini App gọi `getPhoneNumber()` → nhận `token` (hết hạn sau ~2 phút)
 *   2. Mini App gửi `token` + `accessToken` (từ `getAccessToken()`) lên backend
 *   3. Backend gọi GET https://graph.zalo.me/v2.0/me/info
 *        header: access_token, code=<token>, secret_key=<App Secret của Mini App>
 *      → { data: { number: "84xxxxxxxxx" } }
 * App Secret chỉ nằm ở backend (ZALO_APP_SECRET), không bao giờ đưa xuống Mini App.
 */
@Injectable()
export class ZaloService {
  constructor(private readonly config: ConfigService) {}

  private async graph<T extends GraphResponse>(url: string, headers: Record<string, string>): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    } catch {
      throw new InternalServerErrorException("Không kết nối được Zalo Graph API");
    }
    const body = (await res.json().catch(() => ({}))) as T;
    if (!res.ok || (body.error !== undefined && body.error !== 0)) {
      throw new UnauthorizedException(`Zalo từ chối: ${body.message ?? res.status}`);
    }
    return body;
  }

  async getProfile(accessToken: string): Promise<ZaloProfile> {
    if (!accessToken) throw new BadRequestException("Thiếu zalo_access_token");
    const body = await this.graph<GraphResponse & { id?: string; name?: string; picture?: { data?: { url?: string } } }>(
      "https://graph.zalo.me/v2.0/me?fields=id,name,picture",
      { access_token: accessToken },
    );
    if (!body.id) throw new UnauthorizedException("Access token Zalo không hợp lệ");
    return { id: body.id, name: body.name?.trim() || "Người dùng Zalo", avatarUrl: body.picture?.data?.url };
  }

  /** Trả về SĐT dạng 0xxxxxxxxx, hoặc null nếu không lấy được (người dùng từ chối / thiếu cấu hình). */
  async getPhoneNumber(accessToken: string, phoneToken: string, appSecret?: string | null): Promise<string | null> {
    // Mini App riêng của từng store có App Secret riêng; mặc định dùng secret của Mini App reMini
    const secret = appSecret || this.config.get<string>("ZALO_APP_SECRET");
    if (!secret) {
      console.warn("[zalo] Chưa cấu hình ZALO_APP_SECRET – bỏ qua bước lấy số điện thoại");
      return null;
    }
    const body = await this.graph<GraphResponse & { data?: { number?: string } }>("https://graph.zalo.me/v2.0/me/info", {
      access_token: accessToken,
      code: phoneToken,
      secret_key: secret,
    });
    return normalizeVnPhone(body.data?.number);
  }
}

/** "84987654321" / "+84 987..." → "0987654321" */
export function normalizeVnPhone(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("84")) digits = "0" + digits.slice(2);
  return /^0\d{9}$/.test(digits) ? digits : null;
}
