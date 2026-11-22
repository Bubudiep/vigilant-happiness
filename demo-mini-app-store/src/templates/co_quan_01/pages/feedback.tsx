import { useAtom } from "jotai";
import { useState } from "react";
import { useSnackbar } from "zmp-ui";

import { Badge, Card, Field, PrimaryButton, Segmented, TextArea, TextInput, TplHeader, TplPage, useDemoAction } from "../../_shared/kit";
import { feedbacksAtom, feedbackTypes } from "../data";

const statusColor = { "Đã tiếp nhận": "#2563eb", "Đang xử lý": "#d97706", "Đã xử lý": "#16a34a" } as const;

export default function FeedbackPage() {
  const { openSnackbar } = useSnackbar();
  const demoAction = useDemoAction();
  const [feedbacks, setFeedbacks] = useAtom(feedbacksAtom);
  const [type, setType] = useState("moi_truong");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [detail, setDetail] = useState("");

  const submit = () => {
    if (!title.trim() || !location.trim()) {
      openSnackbar({ text: "Vui lòng nhập nội dung và địa điểm", type: "warning" });
      return;
    }
    const d = new Date();
    setFeedbacks((f) => [
      {
        id: `f${Date.now()}`,
        type,
        title,
        location,
        date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        status: "Đã tiếp nhận",
      },
      ...f,
    ]);
    setTitle("");
    setLocation("");
    setDetail("");
    openSnackbar({ text: "Đã gửi phản ánh. Cảm ơn bạn!", type: "success" });
  };

  return (
    <TplPage tab>
      <TplHeader title="Phản ánh hiện trường" back={false} />

      <div className="px-4 pt-3">
        <Card className="space-y-4">
          <Field label="Lĩnh vực">
            <Segmented options={feedbackTypes} value={type} onChange={setType} />
          </Field>
          <Field label="Nội dung phản ánh">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Rác thải tồn đọng, ổ gà..." />
          </Field>
          <Field label="Địa điểm">
            <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Số nhà, tên đường, khu phố" />
          </Field>
          <Field label="Mô tả chi tiết">
            <TextArea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Mô tả thêm (không bắt buộc)" />
          </Field>
          <button
            onClick={() => demoAction("Đính kèm ảnh / video")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-4 text-sm text-gray-500"
          >
            📷 Thêm ảnh / video hiện trường
          </button>
          <PrimaryButton className="w-full" onClick={submit}>
            Gửi phản ánh
          </PrimaryButton>
        </Card>
      </div>

      <div className="space-y-2 px-4 pt-5">
        <div className="text-sm font-semibold">Phản ánh của tôi</div>
        {feedbacks.map((f) => (
          <Card key={f.id} className="!p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{f.title}</span>
              <Badge color={statusColor[f.status]}>{f.status}</Badge>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              📍 {f.location} · {f.date}
            </div>
          </Card>
        ))}
      </div>
    </TplPage>
  );
}
