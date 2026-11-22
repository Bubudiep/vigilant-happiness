import { useAtom } from "jotai";
import { useState } from "react";
import { useSearchParams, useSnackbar } from "zmp-ui";

import {
  Badge,
  Card,
  ChipRow,
  Field,
  PrimaryButton,
  Segmented,
  TextArea,
  TplHeader,
  TplPage,
  useTplTheme,
} from "../../_shared/kit";
import { qaListAtom } from "../data";

const topics = [
  { id: "Lương & Phụ cấp", label: "Lương & OT" },
  { id: "BHXH & Phúc lợi", label: "BHXH & Phép" },
  { id: "Hòm thư góp ý", label: "Nhà ăn & Xe tuyến" },
  { id: "An toàn & Môi trường", label: "An toàn xưởng" },
];

export default function MailboxPage() {
  const [params] = useSearchParams();
  const initialMode = params.get("tab") === "feedback" ? "feedback" : "qa";

  const [mode, setMode] = useState<"qa" | "feedback">(initialMode);
  const [topic, setTopic] = useState(topics[0].id);
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [qaList, setQaList] = useAtom(qaListAtom);
  const { openSnackbar } = useSnackbar();
  const theme = useTplTheme();

  const submit = () => {
    if (!content.trim()) {
      openSnackbar({ text: "Vui lòng nhập nội dung câu hỏi hoặc góp ý", type: "warning" });
      return;
    }
    setQaList((list) => [
      {
        id: `q_${Date.now()}`,
        topic: mode === "feedback" ? "Hòm thư góp ý" : topic,
        question: content.trim(),
        answer: "Đã gửi tới Phòng Nhân sự & Công đoàn. Phản hồi trong vòng 24 giờ làm việc.",
        date: "Vừa xong",
        anonymous: mode === "feedback" ? anonymous : false,
      },
      ...list,
    ]);
    setContent("");
    openSnackbar({
      text: mode === "feedback" ? "Đã gửi thư góp ý tới Ban Giám đốc!" : "Đã gửi câu hỏi tới phòng Nhân sự!",
      type: "success",
    });
  };

  return (
    <TplPage tab>
      <TplHeader title="Hòm thư & Hỏi đáp Doanh nghiệp" back={false}>
        <ChipRow
          items={[
            { id: "qa", label: "Hỏi đáp HR & Công đoàn" },
            { id: "feedback", label: "Hòm thư góp ý (Ẩn danh)" },
          ]}
          value={mode}
          onChange={setMode}
          className="pb-2"
        />
      </TplHeader>

      <div className="space-y-3 px-4 pt-3">
        <Card className="space-y-3">
          <div className="text-sm font-bold text-gray-900">
            {mode === "feedback" ? "Gửi ý kiến vào Hòm thư doanh nghiệp" : "Đặt câu hỏi cho Phòng Nhân sự"}
          </div>

          <Segmented options={topics} value={topic} onChange={setTopic} />

          <Field label={mode === "feedback" ? "Nội dung phản ánh / đề xuất cải tiến" : "Câu hỏi của bạn"}>
            <TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                mode === "feedback"
                  ? "Góp ý về bữa ăn ca, xe đưa đón, điều kiện làm việc, an toàn lao động..."
                  : "Hỏi về bảng công, cách tính phụ cấp, thủ tục BHXH, thai sản..."
              }
            />
          </Field>

          {mode === "feedback" && (
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-4 w-4 accent-teal-700"
              />
              Gửi ẩn danh (Không hiển thị tên và mã nhân viên)
            </label>
          )}

          <PrimaryButton className="w-full" onClick={submit}>
            {mode === "feedback" ? "Gửi vào Hòm thư" : "Gửi câu hỏi"}
          </PrimaryButton>
        </Card>

        <div className="text-xs font-bold text-gray-700">Câu hỏi thường gặp & Phản hồi gần đây</div>
        <div className="space-y-2.5">
          {qaList.map((q) => (
            <Card key={q.id} className="space-y-1.5 !p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge color={theme.primary}>{q.topic}</Badge>
                  {q.anonymous && <Badge color="#64748b">Ẩn danh</Badge>}
                </div>
                <span className="text-[11px] text-gray-400">{q.date}</span>
              </div>
              <div className="text-xs font-bold text-gray-900">{q.question}</div>
              {q.answer && (
                <div className="rounded-xl bg-gray-50 p-2.5 text-xs leading-relaxed text-gray-600">
                  {q.answer}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </TplPage>
  );
}
