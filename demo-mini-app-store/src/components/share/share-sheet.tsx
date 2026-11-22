import { useState } from "react";
import { LuCheck, LuCopy, LuMessageCircle, LuSend } from "react-icons/lu";
import { useSnackbar } from "zmp-ui";

import { Sheet } from "@/components/back-aware";
import { company } from "@/data/company";
import {
  appShareThumbnail,
  copyText,
  shareApp,
  shareResultMessage,
  shareTemplate,
  templateThumbnail,
  templateWebLink,
  type ShareableTemplate,
} from "@/utils/share";
import { chatWithCompany } from "@/utils/zalo";

/**
 * Thẻ xem trước nội dung sẽ gửi: giống bong bóng chia sẻ Mini App trong khung chat Zalo,
 * để người dùng biết bạn bè sẽ nhận được gì trước khi bấm gửi.
 */
export function ShareCard({
  title,
  subtitle,
  thumbnail,
  badge,
  color = "#1d4ed8",
  features = [],
}: {
  title: string;
  subtitle: string;
  thumbnail: string;
  badge?: string;
  color?: string;
  features?: string[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
      <div className="relative aspect-[1.2/1] w-full overflow-hidden" style={{ background: `${color}14` }}>
        <img src={thumbnail} alt="" className="h-full w-full object-cover" />
        {badge && (
          <span
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow"
            style={{ background: color }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="p-3.5">
        <div className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">{title}</div>
        <div className="mt-1 line-clamp-2 text-xs text-gray-500">{subtitle}</div>
        {features.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {features.slice(0, 3).map((f) => (
              <span key={f} className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${color}12`, color }}>
                {f}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-1.5 border-t border-gray-100 pt-2.5 text-[11px] text-gray-400">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-brand-600 text-[8px] font-black text-white">
            {company.shortName}
          </span>
          Mini App · {company.name}
        </div>
      </div>
    </div>
  );
}

export interface ShareSheetTemplate extends ShareableTemplate {
  color?: string;
  features?: string[];
}

/**
 * Bảng chia sẻ dùng chung.
 *  - truyền `template` → chia sẻ link mở thẳng vào mẫu đó
 *  - không truyền     → chia sẻ trang giới thiệu reMini
 */
export default function ShareSheet({
  visible,
  onClose,
  template,
}: {
  visible: boolean;
  onClose: () => void;
  template?: ShareSheetTemplate;
}) {
  const { openSnackbar } = useSnackbar();
  const [copied, setCopied] = useState(false);
  const link = templateWebLink(template?.id);

  const sendViaZalo = async () => {
    const result = template ? await shareTemplate(template) : await shareApp();
    const msg = shareResultMessage(result);
    if (msg) openSnackbar({ text: msg, type: "warning" });
    else if (result.ok) onClose();
  };

  const copy = async () => {
    const ok = await copyText(link);
    setCopied(ok);
    openSnackbar({ text: ok ? "Đã sao chép link" : "Không sao chép được, hãy giữ để chọn link", type: ok ? "success" : "warning" });
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet visible={visible} onClose={onClose} autoHeight mask handler swipeToClose>
      <div className="max-h-[80vh] overflow-y-auto px-4 pb-4 pt-1 safe-bottom">
        <div className="mb-3">
          <div className="text-base font-bold text-gray-900">{template ? "Chia sẻ mẫu này" : `Chia sẻ ${company.name}`}</div>
          <div className="text-xs text-gray-500">Bạn bè sẽ nhận được thẻ Mini App như bên dưới</div>
        </div>

        {template ? (
          <ShareCard
            title={template.brand ? `${template.brand} · ${template.name}` : template.name}
            subtitle={template.description ?? ""}
            thumbnail={templateThumbnail(template.id)}
            badge={template.code ? `Mẫu ${template.code}` : undefined}
            color={template.color}
            features={template.features}
          />
        ) : (
          <ShareCard title={`${company.name} · ${company.slogan}`} subtitle={company.description} thumbnail={appShareThumbnail()} />
        )}

        <button
          onClick={sendViaZalo}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white active:opacity-90"
        >
          <LuSend size={17} /> Gửi cho bạn bè trên Zalo
        </button>

        {link && (
          <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-gray-50 p-1.5 pl-3 ring-1 ring-black/5">
            <span className="min-w-0 flex-1 truncate text-xs text-gray-600 select-all">{link}</span>
            <button
              onClick={copy}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm"
            >
              {copied ? <LuCheck size={14} /> : <LuCopy size={14} />} {copied ? "Đã chép" : "Sao chép"}
            </button>
          </div>
        )}

        {template && (
          <button
            onClick={() => {
              onClose();
              chatWithCompany(`Tôi quan tâm mẫu ${template.code ?? ""} - ${template.name}`.trim());
            }}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-brand-600"
          >
            <LuMessageCircle size={16} /> Tư vấn mẫu này
          </button>
        )}
      </div>
    </Sheet>
  );
}
