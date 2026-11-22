import { useState } from "react";
import { useParams, useSnackbar } from "zmp-ui";

import { Sheet } from "@/components/back-aware";
import {
  ActionBar,
  DayPicker,
  EmptyState,
  Field,
  nextDays,
  PrimaryButton,
  TextInput,
  Tile,
  TplHeader,
  TplPage,
  useDemoAction,
  useTplTheme,
} from "../../_shared/kit";
import { SaveButton } from "../components";
import { findProject } from "../data";

export default function ProjectPage() {
  const { id } = useParams();
  const project = findProject(id);
  const theme = useTplTheme();
  const demoAction = useDemoAction();
  const { openSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(nextDays()[2].key);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  if (!project) {
    return (
      <TplPage>
        <TplHeader title="Dự án" />
        <EmptyState emoji="🤔" text="Không tìm thấy dự án" />
      </TplPage>
    );
  }

  const register = () => {
    if (!name.trim() || !phone.trim()) {
      openSnackbar({ text: "Vui lòng nhập họ tên và số điện thoại", type: "warning" });
      return;
    }
    setOpen(false);
    openSnackbar({ text: `Đã đăng ký xem nhà mẫu ngày ${day}. Chuyên viên sẽ gọi lại!`, type: "success" });
  };

  const info = [
    ["Quy mô", project.area],
    ["Pháp lý", project.legal],
    ["Bàn giao", project.handover],
    ["Chủ đầu tư", project.developer],
  ];

  return (
    <TplPage bottomSpace={68}>
      <TplHeader title={project.name} right={<SaveButton id={project.id} className="!shadow-none" />} />
      <Tile seed={project.id} emoji={project.emoji} color={project.color} className="h-56 w-full" rounded="" size="text-[96px]" />

      <div className="bg-white p-4">
        <div className="text-xl font-bold">{project.name}</div>
        <div className="text-sm text-gray-500">📍 {project.location}</div>
        <div className="mt-2 text-sm">
          Giá từ{" "}
          <span className="text-lg font-bold" style={{ color: theme.accent }}>
            {project.priceFrom}
          </span>
        </div>
      </div>

      <div className="mt-2 divide-y divide-gray-100 bg-white px-4">
        {info.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-3 text-sm">
            <span className="text-gray-500">{k}</span>
            <span className="text-right font-medium">{v}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 bg-white p-4">
        <div className="mb-3 font-semibold">Loại căn & giá</div>
        <div className="space-y-2">
          {project.units.map((u) => (
            <button
              key={u.name}
              onClick={() => demoAction(`Mặt bằng ${u.name}`)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-100 px-3 py-3 text-left text-sm"
            >
              <div>
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-gray-500">{u.size}</div>
              </div>
              <div className="font-bold" style={{ color: theme.primary }}>
                {u.price}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 bg-white p-4">
        <div className="mb-3 font-semibold">Tiện ích</div>
        <div className="flex flex-wrap gap-2">
          {project.amenities.map((a) => (
            <span key={a} className="rounded-full bg-gray-100 px-3 py-1 text-xs">
              {a}
            </span>
          ))}
        </div>
      </div>

      <ActionBar>
        <PrimaryButton outline onClick={() => demoAction("Gọi chuyên viên tư vấn")}>
          Gọi tư vấn
        </PrimaryButton>
        <PrimaryButton className="flex-1" onClick={() => setOpen(true)}>
          Đăng ký xem nhà mẫu
        </PrimaryButton>
      </ActionBar>

      <Sheet visible={open} onClose={() => setOpen(false)} autoHeight mask handler swipeToClose>
        <div className="space-y-4 px-4 pb-6 pt-2 safe-bottom">
          <div className="text-lg font-bold">Đăng ký xem nhà mẫu</div>
          <Field label="Ngày tham quan">
            <DayPicker value={day} onChange={setDay} />
          </Field>
          <Field label="Họ tên">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
          </Field>
          <Field label="Số điện thoại">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxx" inputMode="tel" />
          </Field>
          <PrimaryButton className="w-full" onClick={register}>
            Gửi đăng ký
          </PrimaryButton>
        </div>
      </Sheet>
    </TplPage>
  );
}
