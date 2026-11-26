import { Button, Progress, Skeleton, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { LuCrown, LuLifeBuoy } from "react-icons/lu";
import { fmtBytes } from "../data/format";
import { fetchStorePlan, type StorePlanInfo } from "../data/store-api";
import { PlanRegisterModal, planRequestSentAt } from "./PlanRegisterModal";

const SUB_STATUS: Record<string, { label: string; color: string }> = {
  active: { label: "Đang dùng", color: "green" },
  trial: { label: "Dùng thử", color: "blue" },
  expired: { label: "Hết hạn", color: "red" },
  cancelled: { label: "Đã huỷ", color: "default" },
  suspended: { label: "Tạm khoá", color: "red" },
};

/** Thanh hạn mức: đã dùng / tối đa (null = không giới hạn) */
function Meter({
  label,
  used,
  max,
  fmt = (n: number) => n.toLocaleString("vi-VN"),
}: {
  label: string;
  used: number;
  max: number | null;
  fmt?: (n: number) => string;
}) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const over = max != null && used > max;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span
          className={`tabular-nums ${over ? "font-semibold text-red-600" : "text-slate-500"}`}
        >
          {fmt(used)} / {max == null ? "∞" : fmt(max)}
        </span>
      </div>
      <Progress
        percent={max == null ? 100 : pct}
        showInfo={false}
        size="small"
        strokeColor={
          max == null
            ? "#cbd5e1"
            : over || pct >= 90
              ? "#dc2626"
              : pct >= 75
                ? "#f59e0b"
                : undefined
        }
        className="!mb-0"
      />
    </div>
  );
}

/**
 * Gói dịch vụ đang dùng + hạn mức (sản phẩm, nhân sự, dung lượng ảnh) — hiện ở Tổng quan.
 * `refreshKey` đổi → tải lại (VD sau khi thêm sản phẩm / nhân viên).
 */
export function StorePlanCard({
  storeId,
  storeName,
  phone,
  refreshKey,
  onSupport,
}: {
  storeId: string;
  storeName: string;
  phone?: string;
  refreshKey?: unknown;
  onSupport?: () => void;
}) {
  const [info, setInfo] = useState<StorePlanInfo | null | undefined>(undefined);
  const [register, setRegister] = useState(false);
  const [sentAt, setSentAt] = useState(() => planRequestSentAt(storeId));
  useEffect(() => {
    let alive = true;
    fetchStorePlan(storeId)
      .then((d) => alive && setInfo(d))
      .catch(() => alive && setInfo(null));
    return () => {
      alive = false;
    };
  }, [storeId, refreshKey]);

  if (info === undefined)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <Skeleton active paragraph={{ rows: 1 }} title={false} />
      </div>
    );
  if (info === null) return null;

  const sub = info.subscription;
  const u = info.usage;
  const st = sub
    ? (SUB_STATUS[sub.status] ?? { label: sub.status, color: "default" })
    : null;
  const days = sub?.daysLeft ?? null;
  const expiring = days != null && days <= 14;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <LuCrown size={17} />
          </div>
          <div className="min-w-0">
            {sub ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-base font-semibold text-slate-900">
                    Gói {sub.plan.name}
                  </span>
                  {st && (
                    <Tag color={st.color} className="!m-0">
                      {st.label}
                    </Tag>
                  )}
                  <span className="text-xs text-slate-500">
                    ·{" "}
                    {sub.billingCycle === "yearly" ? "theo năm" : "theo tháng"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Hết hạn{" "}
                  <b className="font-semibold text-slate-700">
                    {dayjs(sub.expiresAt).format("DD/MM/YYYY")}
                  </b>
                  {days != null && (
                    <span
                      className={expiring ? "font-semibold text-red-600" : ""}
                    >
                      {" "}
                      ·{" "}
                      {days >= 0 ? `còn ${days} ngày` : `quá hạn ${-days} ngày`}
                    </span>
                  )}
                  {sub.autoRenew && " · tự gia hạn"}
                </div>
                {sub.plan.features.length > 0 && (
                  <Tooltip title={sub.plan.features.join(" · ")}>
                    <div className="mt-1 truncate text-xs text-slate-400">
                      {sub.plan.features.join(" · ")}
                    </div>
                  </Tooltip>
                )}
              </>
            ) : (
              <>
                <div className="text-base font-semibold text-slate-900">
                  Chưa gắn gói dịch vụ
                </div>
                <div className="text-xs text-slate-500">
                  Đăng ký gói để mở đủ hạn mức cho gian hàng.
                </div>
              </>
            )}
            {(expiring || !sub) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Button
                  size="small"
                  type="primary"
                  icon={<LuCrown size={13} />}
                  onClick={() => setRegister(true)}
                >
                  {sub ? "Gia hạn gói" : "Đăng ký gói"}
                </Button>
                {onSupport && (
                  <Button
                    size="small"
                    type="link"
                    icon={<LuLifeBuoy size={13} />}
                    className="!px-0"
                    onClick={onSupport}
                  >
                    Liên hệ hỗ trợ
                  </Button>
                )}
                {sentAt && (
                  <span className="text-2xs text-emerald-700">
                    Đã gửi yêu cầu {dayjs(sentAt).format("HH:mm DD/MM")} —
                    reMini sẽ liên hệ
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="grid gap-x-5 gap-y-3 sm:grid-cols-3">
          <Meter
            label="Sản phẩm & dịch vụ"
            used={u.products}
            max={sub?.plan.maxProducts ?? null}
          />
          <Meter
            label="Nhân sự"
            used={u.staff}
            max={sub?.plan.maxStaff ?? null}
          />
          <Meter
            label="Dung lượng ảnh"
            used={u.usedBytes}
            max={u.quotaBytes}
            fmt={fmtBytes}
          />
        </div>
      </div>
      <PlanRegisterModal
        open={register}
        storeId={storeId}
        storeName={storeName}
        phone={phone}
        currentPlanCode={sub?.plan.code}
        onClose={() => setRegister(false)}
        onSent={() => setSentAt(planRequestSentAt(storeId))}
      />
    </div>
  );
}
