import { useState } from "react";
import { LuShare2 } from "react-icons/lu";

import ShareSheet from "@/components/share/share-sheet";
import { company, stats } from "@/data/company";
import { chatWithCompany } from "@/utils/zalo";

export default function Hero({ onViewDemos }: { onViewDemos: () => void }) {
  const [shareOpen, setShareOpen] = useState(false);
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white safe-top">
      <div className="pointer-events-none absolute -right-16 -top-10 h-56 w-56 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/10" />

      <div className="zalo-capsule-space relative flex h-12 items-center gap-2.5 pl-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black tracking-tight text-brand-600 shadow-sm">
          {company.shortName}
        </div>
        <div className="leading-tight">
          <div className="text-base font-extrabold">{company.name}</div>
          <div className="text-[11px] text-white/80">{company.owner}</div>
        </div>
        <button
          onClick={() => setShareOpen(true)}
          aria-label="Chia sẻ"
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/15"
        >
          <LuShare2 size={16} />
        </button>
      </div>
      <ShareSheet visible={shareOpen} onClose={() => setShareOpen(false)} />

      <div className="relative px-4 pb-6 pt-4">
        <div className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs">Kho mẫu Zalo Mini App</div>
        <h1 className="mt-3 text-[26px] font-bold leading-tight">{company.slogan}</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/85">{company.description}</p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onViewDemos}
            className="flex-1 rounded-xl bg-white py-3 text-sm font-semibold text-brand-700 shadow"
          >
            Xem mẫu demo
          </button>
          <button
            onClick={() => chatWithCompany("Tôi muốn tư vấn làm Mini App")}
            className="flex-1 rounded-xl border border-white/60 py-3 text-sm font-semibold"
          >
            Tư vấn ngay
          </button>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2 rounded-2xl bg-white/10 p-3 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-base font-bold">{s.value}</div>
              <div className="text-[10px] leading-tight text-white/80">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
