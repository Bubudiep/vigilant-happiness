import { useAtom } from "jotai";
import { useNavigate, useSnackbar } from "zmp-ui";

import { formatPrice, Tile, useTplTheme } from "../_shared/kit";
import { path, queueAtom, Service } from "./data";

export function ServiceRow({ service }: { service: Service }) {
  const navigate = useNavigate();
  const theme = useTplTheme();
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <Tile seed={service.id} emoji={service.emoji} color={service.color} className="h-20 w-20" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="text-sm font-semibold">{service.name}</div>
        <div className="line-clamp-1 text-xs text-gray-500">
          ⏱ {service.minutes} phút · {service.description}
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div>
            <span className="text-sm font-bold" style={{ color: theme.accent }}>
              {formatPrice(service.salePrice ?? service.price)}
            </span>
            {service.salePrice && <span className="ml-1 text-[11px] text-gray-400 line-through">{formatPrice(service.price)}</span>}
          </div>
          <button
            onClick={() => navigate(path(`/book/${service.id}`))}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: theme.primary }}
          >
            Đặt lịch
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hàng chờ trực tiếp tại tiệm + nút lấy số (khách vãng lai). */
export function QueueCard() {
  const theme = useTplTheme();
  const { openSnackbar } = useSnackbar();
  const [q, setQ] = useAtom(queueAtom);
  const mine = q.myNumber > 0;
  const ahead = mine ? Math.max(0, q.myNumber - q.serving - 1) : q.waiting;

  const take = () => {
    if (mine) {
      openSnackbar({ text: `Số của bạn là ${q.myNumber}. Tiệm sẽ nhắn Zalo khi gần tới lượt.`, type: "info" });
      return;
    }
    const n = q.serving + q.waiting + 1;
    setQ({ ...q, waiting: q.waiting + 1, myNumber: n });
    openSnackbar({ text: `Đã lấy số ${n} — tiệm sẽ nhắn Zalo khi còn 1 người`, type: "success" });
  };

  return (
    <div className="mx-4 overflow-hidden rounded-2xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${theme.primary}, #4b5563)` }}>
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold opacity-90">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Hàng chờ tại tiệm
        </span>
        <span className="text-[11px] opacity-70">Cập nhật trực tiếp</span>
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 py-3 text-center">
        <div>
          <div className="text-2xl font-black">{q.serving}</div>
          <div className="text-[11px] opacity-70">Đang phục vụ</div>
        </div>
        <div>
          <div className="text-2xl font-black">{ahead}</div>
          <div className="text-[11px] opacity-70">{mine ? "Trước bạn" : "Đang chờ"}</div>
        </div>
        <div>
          <div className="text-2xl font-black">~{(ahead + 1) * 15}′</div>
          <div className="text-[11px] opacity-70">Ước tính chờ</div>
        </div>
      </div>
      <button onClick={take} className="w-full py-3 text-sm font-bold" style={{ background: mine ? "rgba(255,255,255,.12)" : theme.accent }}>
        {mine ? `🎫 Số của bạn: ${q.myNumber}` : "🎫 Lấy số xếp hàng"}
      </button>
    </div>
  );
}
