import { clients, offers, pricing, steps } from "@/data/company";
import { chatWithCompany } from "@/utils/zalo";

import Section from "./section";

export function HowItWorks() {
  return (
    <Section eyebrow="Quy trình" title="Có Mini App chỉ với 3 bước">
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={s.title} className="flex gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-600">
              {i + 1}
            </div>
            <div>
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm text-gray-500">{s.text}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Offers() {
  return (
    <Section eyebrow="Ưu đãi" title="Ưu đãi đang áp dụng">
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
        {offers.map((o) => (
          <div
            key={o.title}
            className="w-64 shrink-0 rounded-2xl bg-gradient-to-br from-accent to-orange-400 p-4 text-white shadow"
          >
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-semibold">{o.badge}</span>
            <div className="mt-2 text-lg font-bold leading-snug">{o.title}</div>
            <div className="mt-1 text-xs text-white/90">{o.text}</div>
            <button
              onClick={() => chatWithCompany(`Tôi muốn nhận ưu đãi: ${o.title}`)}
              className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-orange-600"
            >
              Nhận ưu đãi
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Pricing() {
  return (
    <Section eyebrow="Bảng giá" title="Gói dịch vụ">
      <div className="space-y-3">
        {pricing.map((p) => (
          <div
            key={p.name}
            className={`rounded-2xl bg-white p-4 shadow-sm ${p.highlight ? "border-2 border-brand-500" : "border border-gray-200/80"}`}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold">
                {p.name}
                {p.highlight && (
                  <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600">
                    Phổ biến
                  </span>
                )}
              </div>
              <div className="font-bold text-brand-600">{p.price}</div>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {p.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Clients() {
  return (
    <Section eyebrow="Khách hàng" title="Khách hàng nói gì về chúng tôi">
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
        {clients.map((c) => (
          <div key={c.name} className="w-64 shrink-0 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
            <div className="text-2xl leading-none text-brand-500">“</div>
            <p className="text-sm leading-relaxed text-gray-700">{c.quote}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                {c.name.charAt(c.name.length - 1)}
              </div>
              <div>
                <div className="text-sm font-semibold">{c.name}</div>
                <div className="text-[11px] text-gray-400">{c.industry}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
