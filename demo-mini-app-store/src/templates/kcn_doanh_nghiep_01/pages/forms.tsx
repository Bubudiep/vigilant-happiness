import { useAtom } from "jotai";
import { useState } from "react";
import { LuCamera, LuUpload } from "react-icons/lu";
import { useSearchParams, useSnackbar } from "zmp-ui";

import {
  Badge,
  Card,
  ChipRow,
  Field,
  PrimaryButton,
  Segmented,
  TextArea,
  TextInput,
  TplHeader,
  TplPage,
  useTplTheme,
} from "../../_shared/kit";
import { docTypes, FormRequest, formRequestsAtom, submittedDocsAtom } from "../data";

export default function FormsPage() {
  const [params] = useSearchParams();
  const initialTab = params.get("tab") === "docs" ? "docs" : "form";
  const initialType = (params.get("type") as FormRequest["category"] | null) ?? "leave";

  const [tab, setTab] = useState<"form" | "docs">(initialTab);
  const [formType, setFormType] = useState<FormRequest["category"]>(initialType);
  const [dateStr, setDateStr] = useState("20/11/2026");
  const [detail, setDetail] = useState("");
  const [hasPhoto, setHasPhoto] = useState(false);

  const [docType, setDocType] = useState(docTypes[0]);
  const [docNote, setDocNote] = useState("");

  const [forms, setForms] = useAtom(formRequestsAtom);
  const [docs, setDocs] = useAtom(submittedDocsAtom);
  const { openSnackbar } = useSnackbar();
  const theme = useTplTheme();

  const submitForm = () => {
    const titleMap: Record<FormRequest["category"], string> = {
      leave: `Đơn xin nghỉ phép (${dateStr})`,
      ot: `Đăng ký tăng ca OT (${dateStr})`,
      explain: `Giải trình chấm công (${dateStr})`,
      report: `Báo cáo hiện trường / 5S (${dateStr})`,
    };
    setForms((list) => [
      {
        id: `f_${Date.now()}`,
        category: formType,
        title: titleMap[formType],
        detail: detail.trim() || (hasPhoto ? "Đã đính kèm ảnh chụp hiện trường" : "Chờ Tổ trưởng & HR phê duyệt"),
        date: "Hôm nay",
        status: "pending",
      },
      ...list,
    ]);
    setDetail("");
    setHasPhoto(false);
    openSnackbar({ text: "Đã gửi phiếu thành công!", type: "success" });
  };

  const submitDoc = () => {
    setDocs((list) => [
      {
        id: `d_${Date.now()}`,
        type: docType,
        fileName: `anh_chup_${Date.now().toString().slice(-4)}.jpg`,
        date: "Hôm nay",
        status: "pending",
        note: docNote.trim() || "Đã tải ảnh lên, chờ HR đối chiếu",
      },
      ...list,
    ]);
    setDocNote("");
    openSnackbar({ text: "Đã nộp ảnh giấy tờ cho phòng Nhân sự!", type: "success" });
  };

  return (
    <TplPage tab>
      <TplHeader title="Đơn từ, Báo cáo & Nộp giấy tờ" back={false}>
        <ChipRow
          items={[
            { id: "form", label: "Tạo đơn từ & Báo cáo" },
            { id: "docs", label: "Nộp ảnh giấy tờ HR" },
          ]}
          value={tab}
          onChange={setTab}
          className="pb-2"
        />
      </TplHeader>

      {tab === "form" ? (
        <div className="space-y-3 px-4 pt-3">
          <Card className="space-y-3">
            <div className="text-sm font-bold text-gray-900">Chọn loại phiếu cần gửi</div>
            <Segmented
              options={[
                { id: "leave", label: "Nghỉ phép" },
                { id: "ot", label: "Đăng ký OT" },
                { id: "explain", label: "Giải trình công" },
                { id: "report", label: "Báo cáo 5S / Sự cố" },
              ]}
              value={formType}
              onChange={setFormType}
            />

            <Field label={formType === "report" ? "Vị trí / Phân xưởng" : "Ngày áp dụng"}>
              <TextInput
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                placeholder="VD: 20/11/2026 hoặc Chuyền A3"
              />
            </Field>

            <Field label="Nội dung / Lý do chi tiết">
              <TextArea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={
                  formType === "report"
                    ? "Mô tả sự cố máy móc, an toàn lao động hoặc đề xuất 5S..."
                    : "Nhập lý do xin nghỉ, số giờ OT hoặc giờ ra thực tế..."
                }
              />
            </Field>

            <button
              type="button"
              onClick={() => setHasPhoto((v) => !v)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-xs font-semibold"
              style={{
                borderColor: hasPhoto ? "#16a34a" : theme.primary,
                color: hasPhoto ? "#16a34a" : theme.primary,
              }}
            >
              <LuCamera size={16} />
              {hasPhoto ? "Đã đính kèm 1 ảnh chụp" : "Đính kèm ảnh minh chứng / hiện trường"}
            </button>

            <PrimaryButton className="w-full" onClick={submitForm}>
              Gửi phiếu phê duyệt
            </PrimaryButton>
          </Card>

          <div className="text-xs font-bold text-gray-700">Lịch sử đơn từ & báo cáo ({forms.length})</div>
          <div className="space-y-2">
            {forms.map((f) => (
              <Card key={f.id} className="space-y-1 !p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-bold text-gray-900">{f.title}</span>
                  <Badge color={f.status === "approved" ? "#16a34a" : "#d97706"}>
                    {f.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">{f.detail}</div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3 px-4 pt-3">
          <Card className="space-y-3">
            <div className="text-sm font-bold text-gray-900">Chụp & nộp ảnh hồ sơ giấy tờ</div>
            <Field label="Loại giấy tờ cần nộp">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm outline-none ring-1 ring-black/5"
              >
                {docTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <div
              onClick={submitDoc}
              className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/40 py-5 text-center"
            >
              <LuUpload size={24} style={{ color: theme.primary }} />
              <div className="text-xs font-bold text-gray-800">Bấm để chụp ảnh hoặc chọn từ thư viện</div>
              <div className="text-[11px] text-gray-500">Hỗ trợ ảnh CCCD, giấy nghỉ ốm BHXH, bằng cấp...</div>
            </div>

            <Field label="Ghi chú thêm cho HR (không bắt buộc)">
              <TextInput
                value={docNote}
                onChange={(e) => setDocNote(e.target.value)}
                placeholder="VD: Bổ sung bản chụp rõ dấu đỏ bệnh viện..."
              />
            </Field>

            <PrimaryButton className="w-full" onClick={submitDoc}>
              Nộp ảnh giấy tờ
            </PrimaryButton>
          </Card>

          <div className="text-xs font-bold text-gray-700">Giấy tờ đã nộp ({docs.length})</div>
          <div className="space-y-2">
            {docs.map((d) => (
              <Card key={d.id} className="flex items-center justify-between gap-3 !p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-gray-900">{d.type}</div>
                  <div className="truncate text-[11px] text-gray-500">
                    {d.fileName} · {d.date}
                  </div>
                  {d.note && <div className="mt-0.5 text-[11px] text-teal-700">{d.note}</div>}
                </div>
                <Badge color={d.status === "approved" ? "#16a34a" : "#d97706"}>
                  {d.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </TplPage>
  );
}
