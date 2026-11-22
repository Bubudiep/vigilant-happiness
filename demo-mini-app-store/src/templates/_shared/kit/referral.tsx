import { useState } from "react";
import { LuCheck, LuCopy, LuGift, LuSend } from "react-icons/lu";
import { useSnackbar } from "zmp-ui";

import { copyText, shareReferral, shareResultMessage } from "@/utils/share";

import { useTplTheme } from "./theme";

/**
 * Module "Mời bạn bè" dùng chung cho mọi mẫu — kiểu chương trình giới thiệu mà shop thật hay chạy:
 * mã giới thiệu, ưu đãi 2 chiều, nút gửi thẻ Mini App qua Zalo và đếm số bạn đã mời.
 */
export function ReferralCard({
  offer = "voucher 20K",
  reward = "Bạn nhận 20K khi bạn bè đặt đơn đầu tiên",
  code = "DEMO2026",
  invited = 2,
}: {
  offer?: string;
  reward?: string;
  code?: string;
  invited?: number;
}) {
  const theme = useTplTheme();
  const { openSnackbar } = useSnackbar();
  const [copied, setCopied] = useState(false);

  const invite = async () => {
    if (!theme.templateId) return;
    const res = await shareReferral(
      { id: theme.templateId, name: theme.templateName ?? "", brand: theme.brand, code: theme.templateCode },
      offer,
    );
    const msg = shareResultMessage(res);
    if (msg) openSnackbar({ text: msg, type: "warning" });
  };

  const copyCode = async () => {
    const ok = await copyText(code);
    setCopied(ok);
    openSnackbar({ text: ok ? `Đã sao chép mã ${code}` : "Không sao chép được", type: ok ? "success" : "warning" });
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative mx-4 mt-4 overflow-hidden rounded-2xl p-4 text-white shadow-sm"
      style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.accent} 100%)` }}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15" />
      <div className="relative flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <LuGift size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">Mời bạn bè – tặng {offer}</div>
          <div className="mt-0.5 text-xs text-white/85">{reward}</div>
        </div>
      </div>

      <div className="relative mt-3 flex items-center gap-2">
        <button
          onClick={copyCode}
          className="flex flex-1 items-center justify-between rounded-xl border border-dashed border-white/60 bg-white/10 px-3 py-2 text-left"
        >
          <span>
            <span className="block text-[10px] uppercase tracking-wider text-white/75">Mã giới thiệu</span>
            <span className="text-sm font-extrabold tracking-widest">{code}</span>
          </span>
          {copied ? <LuCheck size={16} /> : <LuCopy size={16} />}
        </button>
        <button
          onClick={invite}
          className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-3 text-xs font-bold shadow-sm"
          style={{ color: theme.primary }}
        >
          <LuSend size={14} /> Mời qua Zalo
        </button>
      </div>

      <div className="relative mt-2.5 text-[11px] text-white/80">Đã mời {invited} bạn · Ưu đãi tự động cộng vào ví voucher</div>
    </div>
  );
}
