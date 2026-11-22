import { useAtom, useAtomValue } from "jotai";
import { LuCamera, LuCheckCheck, LuClock, LuFileText, LuMessageSquare } from "react-icons/lu";
import { useNavigate, useSnackbar } from "zmp-ui";

import {
  Badge,
  BrandHeader,
  Card,
  SectionTitle,
  ShortcutGrid,
  TplPage,
  useTplTheme,
} from "../../_shared/kit";
import {
  checkedOutTodayAtom,
  employee,
  formRequestsAtom,
  path,
  qaListAtom,
  submittedDocsAtom,
} from "../data";

export default function HomePage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const theme = useTplTheme();
  const [checkedOut, setCheckedOut] = useAtom(checkedOutTodayAtom);
  const docs = useAtomValue(submittedDocsAtom);
  const forms = useAtomValue(formRequestsAtom);
  const qaList = useAtomValue(qaListAtom);

  const handlePunch = () => {
    if (!checkedOut) {
      setCheckedOut(true);
      openSnackbar({ text: "Đã ghi nhận chấm công ra ca lúc 16:32!", type: "success" });
    } else {
      navigate(path("/timesheet"));
    }
  };

  return (
    <TplPage tab>
      <BrandHeader
        logo="🏢"
        name="VinaTech Industrial"
        subtitle={`${employee.name} · Mã NV: ${employee.code}`}
        variant="solid"
      />

      {/* Thẻ Check công & Tổng hợp công tháng */}
      <div className="px-4 pt-3">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">{employee.dept}</div>
              <div className="text-sm font-bold text-gray-900">Hôm nay · {employee.shift}</div>
            </div>
            <Badge color={theme.primary}>{checkedOut ? "Đã đủ công" : "Đang trong ca"}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-gray-50 p-2.5 text-xs">
            <div className="flex items-center gap-2">
              <LuClock size={16} className="text-emerald-600" />
              <div>
                <div className="text-gray-400">Giờ vào</div>
                <div className="font-bold text-gray-900">07:22</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LuCheckCheck size={16} className={checkedOut ? "text-emerald-600" : "text-gray-400"} />
              <div>
                <div className="text-gray-400">Giờ ra</div>
                <div className="font-bold text-gray-900">{checkedOut ? "16:32" : "--:--"}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePunch}
              className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white shadow-sm"
              style={{ background: theme.primary }}
            >
              {checkedOut ? "Xem bảng công chi tiết" : "Xác nhận chấm công ra"}
            </button>
            <button
              onClick={() => navigate(path("/forms?tab=form&type=explain"))}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-700"
            >
              Giải trình công
            </button>
          </div>

          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 pt-2.5 text-center text-xs">
            <div>
              <div className="text-sm font-extrabold text-gray-900">22 / 26</div>
              <div className="text-[11px] text-gray-500">Công tháng 11</div>
            </div>
            <div>
              <div className="text-sm font-extrabold" style={{ color: theme.accent }}>14.5 giờ</div>
              <div className="text-[11px] text-gray-500">Tăng ca (OT)</div>
            </div>
            <div>
              <div className="text-sm font-extrabold text-emerald-600">5 ngày</div>
              <div className="text-[11px] text-gray-500">Phép còn lại</div>
            </div>
          </div>
        </Card>
      </div>

      {/* 8 tác vụ chính */}
      <div className="mt-3">
        <ShortcutGrid
          cols={4}
          items={[
            { emoji: "📅", label: "Bảng công", onClick: () => navigate(path("/timesheet")) },
            { emoji: "📸", label: "Nộp giấy tờ", onClick: () => navigate(path("/forms?tab=docs")) },
            { emoji: "📝", label: "Xin nghỉ phép", onClick: () => navigate(path("/forms?tab=form&type=leave")) },
            { emoji: "⏱️", label: "Đăng ký OT", onClick: () => navigate(path("/forms?tab=form&type=ot")) },
            { emoji: "📢", label: "Báo cáo sự cố", onClick: () => navigate(path("/forms?tab=form&type=report")) },
            { emoji: "💌", label: "Hòm thư góp ý", onClick: () => navigate(path("/mailbox?tab=feedback")) },
            { emoji: "💬", label: "Hỏi đáp HR", onClick: () => navigate(path("/mailbox")) },
            { emoji: "💵", label: "Phiếu lương", onClick: () => navigate(path("/account")) },
          ]}
        />
      </div>

      {/* Nộp ảnh giấy tờ & Đơn từ gần đây */}
      <div className="mt-4">
        <SectionTitle
          title="Đơn từ & Giấy tờ đã nộp"
          action="Nộp mới"
          onAction={() => navigate(path("/forms"))}
        />
        <div className="mt-2.5 space-y-2 px-4">
          {docs.slice(0, 2).map((d) => (
            <Card
              key={d.id}
              className="flex items-center gap-3 !p-3"
              onClick={() => navigate(path("/forms?tab=docs"))}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${theme.primary}14`, color: theme.primary }}
              >
                <LuCamera size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-gray-900">{d.type}</div>
                <div className="truncate text-[11px] text-gray-500">
                  {d.fileName} · {d.date}
                </div>
              </div>
              <Badge color={d.status === "approved" ? "#16a34a" : "#d97706"}>
                {d.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
              </Badge>
            </Card>
          ))}

          {forms.slice(0, 2).map((f) => (
            <Card
              key={f.id}
              className="flex items-center gap-3 !p-3"
              onClick={() => navigate(path("/forms"))}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"
              >
                <LuFileText size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-gray-900">{f.title}</div>
                <div className="truncate text-[11px] text-gray-500">{f.detail}</div>
              </div>
              <Badge color={f.status === "approved" ? "#16a34a" : "#d97706"}>
                {f.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
              </Badge>
            </Card>
          ))}
        </div>
      </div>

      {/* Hỏi đáp & Hòm thư doanh nghiệp */}
      <div className="mt-4">
        <SectionTitle
          title="Hỏi đáp & Phản hồi từ Nhân sự"
          action="Gửi câu hỏi"
          onAction={() => navigate(path("/mailbox"))}
        />
        <div className="mt-2.5 space-y-2 px-4">
          {qaList.slice(0, 2).map((q) => (
            <Card
              key={q.id}
              className="space-y-1.5 !p-3"
              onClick={() => navigate(path("/mailbox"))}
            >
              <div className="flex items-center justify-between">
                <Badge color={theme.accent}>{q.topic}</Badge>
                <span className="text-[11px] text-gray-400">{q.date}</span>
              </div>
              <div className="flex items-start gap-1.5 text-xs font-bold text-gray-900">
                <LuMessageSquare size={14} className="mt-0.5 shrink-0 text-teal-700" />
                <span>{q.question}</span>
              </div>
              {q.answer && (
                <div className="rounded-lg bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-600">
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
