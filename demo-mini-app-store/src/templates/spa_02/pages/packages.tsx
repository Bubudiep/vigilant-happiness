import { useAtom } from "jotai";
import { useNavigate, useSnackbar } from "zmp-ui";

import { formatPrice, Tile, TplHeader, TplPage, useTplTheme } from "../../_shared/kit";
import { findPackage, findService, myPackagesAtom, packages, path } from "../data";

export default function PackagesPage() {
  const navigate = useNavigate();
  const theme = useTplTheme();
  const { openSnackbar } = useSnackbar();
  const [mine, setMine] = useAtom(myPackagesAtom);

  const buy = (id: string) => {
    const p = findPackage(id)!;
    setMine((l) => [...l, { packageId: id, used: 0, expires: "31/05/2027" }]);
    openSnackbar({ text: `Đã mua ${p.name} (demo) — đặt buổi đầu ngay nhé!`, type: "success" });
  };

  return (
    <TplPage tab>
      <TplHeader title="Gói liệu trình" back={false} />

      {mine.length > 0 && (
        <div className="space-y-2 px-4 pt-3">
          <div className="text-sm font-semibold">Gói của bạn</div>
          {mine.map((m, i) => {
            const p = findPackage(m.packageId)!;
            return (
              <div key={i} className="rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold">{p.name}</div>
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: `${theme.primary}14`, color: theme.primary }}>
                    Còn {p.sessions - m.used} buổi
                  </span>
                </div>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: p.sessions }).map((_, k) => (
                    <span key={k} className="h-2 flex-1 rounded-full" style={{ background: k < m.used ? theme.primary : "#e5e7eb" }} />
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                  <span>HSD {m.expires}</span>
                  <button onClick={() => navigate(path(`/book/${p.serviceId}`))} className="font-bold" style={{ color: theme.primary }}>
                    Đặt buổi tiếp ›
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-3 px-4 pb-4 pt-4">
        <div className="text-sm font-semibold">Mua gói tiết kiệm</div>
        {packages.map((p) => {
          const s = findService(p.serviceId)!;
          const save = p.perSession * p.sessions - p.price;
          return (
            <div key={p.id} className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
              {p.best && (
                <span className="absolute right-3 top-3 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: theme.accent }}>
                  Bán chạy
                </span>
              )}
              <div className="flex gap-3 p-3">
                <Tile seed={s.id} emoji={s.emoji} color={s.color} className="h-20 w-20" />
                <div className="min-w-0 flex-1">
                  <div className="pr-14 text-sm font-bold">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.note}</div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-base font-black" style={{ color: theme.primary }}>
                      {formatPrice(p.price)}
                    </span>
                    <span className="text-[11px] text-gray-400 line-through">{formatPrice(p.perSession * p.sessions)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
                <span className="text-xs font-semibold text-emerald-600">Tiết kiệm {formatPrice(save)}</span>
                <button onClick={() => buy(p.id)} className="rounded-full px-4 py-1.5 text-xs font-bold text-white" style={{ background: theme.primary }}>
                  Mua gói
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </TplPage>
  );
}
