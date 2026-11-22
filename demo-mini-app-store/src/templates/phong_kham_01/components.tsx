import { useNavigate } from "zmp-ui";

import { formatPrice, useTplTheme } from "../_shared/kit";
import { Doctor, path, specialtyLabel } from "./data";

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  const navigate = useNavigate();
  const theme = useTplTheme();
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-4xl" style={{ background: `${theme.primary}14` }}>
        {doctor.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{doctor.name}</div>
        <div className="text-xs text-gray-500">
          {doctor.title} · {specialtyLabel(doctor.specialty)}
        </div>
        <div className="mt-0.5 text-xs text-gray-500">
          <span className="text-amber-500">★ {doctor.rating}</span> · {doctor.years} năm kinh nghiệm
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: theme.primary }}>
            {formatPrice(doctor.fee)}
          </span>
          <button
            onClick={() => navigate(path(`/book/${doctor.id}`))}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: theme.primary }}
          >
            Đặt khám
          </button>
        </div>
      </div>
    </div>
  );
}
