import { useSetAtom } from "jotai";
import { useState } from "react";
import { useNavigate, useParams, useSnackbar } from "zmp-ui";

import {
  ActionBar,
  Card,
  DayPicker,
  Field,
  formatPrice,
  nextDays,
  PrimaryButton,
  Segmented,
  TextInput,
  TimeSlots,
  TplHeader,
  TplPage,
  useDemoAction,
  useTplTheme,
} from "../../_shared/kit";
import { bookingsAtom, findNotaryService, notaries, notaryServices, path, slots } from "../data";

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const service = findNotaryService(id) ?? notaryServices[0];
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const demoAction = useDemoAction();
  const theme = useTplTheme();
  const setBookings = useSetAtom(bookingsAtom);

  const [checked, setChecked] = useState<Record<number, boolean>>({ 0: true, 1: true });
  const [locationType, setLocationType] = useState<"office" | "home">("office");
  const days = nextDays(7);
  const [day, setDay] = useState(days[1].key);
  const [slot, setSlot] = useState("09:00");
  const [notaryId, setNotaryId] = useState(notaries[0].id);
  const [address, setAddress] = useState("");

  const extraHomeFee = locationType === "home" ? 500000 : 0;
  const totalFee = service.baseFee + extraHomeFee;
  const notary = notaries.find((n) => n.id === notaryId) ?? notaries[0];

  const toggleDoc = (idx: number) => setChecked((c) => ({ ...c, [idx]: !c[idx] }));

  const submit = () => {
    setBookings((list) => [
      {
        id: `nb_${Date.now()}`,
        title: service.name,
        subtitle: `${notary.name} · ${locationType === "home" ? "Ký ngoài trụ sở" : "Tại văn phòng"}`,
        date: day,
        time: slot,
        emoji: service.emoji,
        status: "upcoming",
      },
      ...list,
    ]);
    openSnackbar({ text: "Đã đặt lịch hẹn ký công chứng!", type: "success" });
    navigate(path("/bookings"), { replace: true });
  };

  return (
    <TplPage bottomSpace={76}>
      <TplHeader title="Chi tiết thủ tục & Đặt lịch ký" />

      <div className="space-y-3 px-4 pt-3">
        <Card>
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.primary }}>
            ⏱ Thời gian xử lý: {service.timeEstimate}
          </div>
          <div className="mt-1 text-base font-bold text-gray-900">{service.name}</div>
          <div className="mt-1 text-xs text-gray-500">{service.feeNote}</div>
        </Card>

        {/* Checklist giấy tờ cần chuẩn bị */}
        <Card className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">1. Giấy tờ cần mang theo</span>
            <span className="text-xs text-gray-400">Bấm để đánh dấu đã có</span>
          </div>
          <div className="space-y-2">
            {service.documents.map((doc, idx) => {
              const ok = !!checked[idx];
              return (
                <button
                  key={doc}
                  type="button"
                  onClick={() => toggleDoc(idx)}
                  className="flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left text-xs"
                  style={
                    ok
                      ? { borderColor: `${theme.primary}55`, background: `${theme.primary}08` }
                      : { borderColor: "#e5e7eb", background: "#fff" }
                  }
                >
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                    style={{ background: ok ? theme.primary : "#d1d5db" }}
                  >
                    ✓
                  </span>
                  <span className="text-gray-800">{doc}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => demoAction("Chụp ảnh giấy tờ gửi qua Zalo để soạn trước hợp đồng")}
            className="mt-1 w-full rounded-xl border border-dashed py-2.5 text-center text-xs font-bold"
            style={{ borderColor: theme.primary, color: theme.primary }}
          >
            📸 Gửi ảnh giấy tờ trước để soạn sẵn hợp đồng
          </button>
        </Card>

        <Card className="space-y-3">
          <div className="text-sm font-bold">2. Chọn địa điểm ký & Công chứng viên</div>
          <Segmented
            options={[
              { id: "office", label: "🏢 Ký tại Văn phòng" },
              { id: "home", label: "🏡 Ký tận nơi (+500K)" },
            ]}
            value={locationType}
            onChange={setLocationType}
          />
          {locationType === "home" && (
            <Field label="Địa chỉ ký ngoài trụ sở (Nhà riêng / Ngân hàng / Bệnh viện)">
              <TextInput
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Nhập địa chỉ cần công chứng viên đến..."
              />
            </Field>
          )}
          <Segmented
            options={notaries.map((n) => ({ id: n.id, label: n.name }))}
            value={notaryId}
            onChange={setNotaryId}
          />
        </Card>

        <Card className="space-y-3">
          <div className="text-sm font-bold">3. Chọn ngày & giờ hẹn ký</div>
          <DayPicker value={day} onChange={setDay} days={days} />
          <TimeSlots slots={slots} value={slot} onChange={setSlot} busy={["10:00", "14:30"]} />
        </Card>
      </div>

      <ActionBar>
        <div className="flex-1">
          <div className="text-xs text-gray-500">Phí dự kiến ({day} · {slot})</div>
          <div className="text-base font-extrabold" style={{ color: theme.primary }}>
            {formatPrice(totalFee)}
          </div>
        </div>
        <PrimaryButton onClick={submit}>Đặt lịch ký ngay</PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}
