import { useState } from "react";
import { useNavigate, useSnackbar } from "zmp-ui";

import { ActionBar, DayPicker, Field, nextDays, PrimaryButton, Segmented, TextArea, TplHeader, TplPage } from "../../_shared/kit";
import { student } from "../data";

export default function LeavePage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [day, setDay] = useState(nextDays()[1].key);
  const [session, setSession] = useState<"full" | "am" | "pm">("full");
  const [reason, setReason] = useState("");

  const submit = () => {
    if (!reason.trim()) {
      openSnackbar({ text: "Vui lòng nhập lý do", type: "warning" });
      return;
    }
    openSnackbar({ text: "Đã gửi đơn xin nghỉ tới GVCN", type: "success" });
    navigate(-1);
  };

  return (
    <TplPage bottomSpace={68}>
      <TplHeader title="Xin nghỉ học" />
      <div className="mx-4 mt-3 space-y-5 rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-sm">
          Học sinh: <b>{student.name}</b> · Lớp {student.className}
        </div>
        <Field label="Ngày nghỉ">
          <DayPicker value={day} onChange={setDay} />
        </Field>
        <Field label="Buổi">
          <Segmented
            options={[
              { id: "full", label: "Cả ngày" },
              { id: "am", label: "Buổi sáng" },
              { id: "pm", label: "Buổi chiều" },
            ]}
            value={session}
            onChange={setSession}
          />
        </Field>
        <Field label="Lý do">
          <TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: con bị sốt, đi khám bệnh..." />
        </Field>
      </div>
      <ActionBar>
        <PrimaryButton onClick={submit} className="flex-1">
          Gửi đơn xin nghỉ
        </PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}
