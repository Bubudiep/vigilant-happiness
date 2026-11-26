import { App as AntApp, Empty, Input, Modal, Segmented, Spin, Tag } from "antd";
import { useEffect, useState } from "react";
import { LuCheck, LuCrown } from "react-icons/lu";
import { api, ApiError, fetchPlans, type PlanRow } from "../data/platform-api";

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const limit = (n: number | null | undefined, unit = "") =>
  n == null || n <= 0
    ? "Không giới hạn"
    : `${n.toLocaleString("vi-VN")}${unit}`;
const storage = (mb?: number | null) =>
  mb == null
    ? "Không giới hạn"
    : mb >= 1024
      ? `${+(mb / 1024).toFixed(1)} GB`
      : `${mb} MB`;

/** Đã gửi yêu cầu đăng ký gói cho store này (lưu trên trình duyệt để nút hiện "Đã gửi yêu cầu") */
const sentKey = (storeId: string) => `remini_plan_request_${storeId}`;
export const planRequestSentAt = (storeId: string) =>
  localStorage.getItem(sentKey(storeId));

/**
 * PlanRegisterModal — chủ shop chọn gói + chu kỳ → gửi yêu cầu đăng ký / gia hạn tới reMini
 * (ticket hỗ trợ loại "billing" gắn với gian hàng). reMini xác nhận thanh toán rồi kích hoạt gói.
 */
export function PlanRegisterModal({
  open,
  storeId,
  storeName,
  phone,
  currentPlanCode,
  onClose,
  onSent,
}: {
  open: boolean;
  storeId: string;
  storeName: string;
  phone?: string;
  /** Đang dùng gói này (gia hạn) */
  currentPlanCode?: string;
  onClose: () => void;
  onSent?: () => void;
}) {
  const { message } = AntApp.useApp();
  const [plans, setPlans] = useState<PlanRow[] | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [contact, setContact] = useState(phone ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNote("");
    setContact(phone ?? "");
    fetchPlans()
      .then((list) => {
        const active = list.filter((p) => p.isActive);
        setPlans(active);
        const cur = active.find((p) => p.code === currentPlanCode);
        setPlanId((cur ?? active[Math.min(1, active.length - 1)])?.id ?? null);
      })
      .catch(() => setPlans([]));
  }, [open, phone, currentPlanCode]);

  const plan = plans?.find((p) => p.id === planId) ?? null;
  const price = plan
    ? cycle === "yearly"
      ? plan.priceYearly
      : plan.priceMonthly
    : 0;
  const renew = !!plan && plan.code === currentPlanCode;

  const submit = async () => {
    if (!plan) return;
    if (!/^[0-9+\s.]{9,15}$/.test(contact.trim()))
      return message.warning("Nhập số điện thoại để reMini liên hệ");
    setBusy(true);
    try {
      await api("/me/tickets", {
        method: "POST",
        body: JSON.stringify({
          storeId,
          category: "billing",
          priority: "high",
          subject:
            `${renew ? "Gia hạn" : "Đăng ký"} gói ${plan.name} — ${storeName}`.slice(
              0,
              150,
            ),
          body: [
            `Gian hàng: ${storeName}`,
            `Gói: ${plan.name} (${plan.code}) · ${cycle === "yearly" ? "theo năm" : "theo tháng"} · ${money(price)}`,
            `SĐT liên hệ: ${contact.trim()}`,
            note.trim() && `Ghi chú: ${note.trim()}`,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
      localStorage.setItem(sentKey(storeId), new Date().toISOString());
      message.success(
        "Đã gửi yêu cầu — reMini sẽ liên hệ xác nhận và kích hoạt gói cho gian hàng",
      );
      onSent?.();
      onClose();
    } catch (e) {
      message.error(
        e instanceof ApiError
          ? e.message
          : "Chưa gửi được yêu cầu, thử lại sau",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={760}
      destroyOnHidden
      title={
        <span className="flex items-center gap-2">
          <LuCrown size={16} className="text-amber-500" />{" "}
          {currentPlanCode
            ? "Gia hạn / đổi gói dịch vụ"
            : "Đăng ký gói dịch vụ"}
        </span>
      }
      okText={plan ? `Gửi yêu cầu · ${money(price)}` : "Gửi yêu cầu"}
      okButtonProps={{ loading: busy, disabled: !plan }}
      onOk={submit}
      cancelText="Huỷ"
    >
      <div data-ui="PlanRegisterModal" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            Chọn gói cho <b className="text-slate-700">{storeName}</b>. reMini
            sẽ gọi xác nhận, gửi thông tin thanh toán và kích hoạt gói.
          </div>
          <Segmented
            size="small"
            value={cycle}
            onChange={(v) => setCycle(v as "monthly" | "yearly")}
            options={[
              { value: "monthly", label: "Theo tháng" },
              { value: "yearly", label: "Theo năm" },
            ]}
          />
        </div>

        {plans === null ? (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        ) : plans.length === 0 ? (
          <Empty description="Chưa có gói dịch vụ nào đang mở bán — liên hệ hotline reMini" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => {
              const on = p.id === planId;
              const pr = cycle === "yearly" ? p.priceYearly : p.priceMonthly;
              const save =
                cycle === "yearly" && p.priceMonthly > 0
                  ? Math.round(
                      (1 - p.priceYearly / (p.priceMonthly * 12)) * 100,
                    )
                  : 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={`relative flex flex-col rounded-xl border p-3 text-left transition ${
                    on
                      ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-100"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">
                      {p.name}
                    </span>
                    {p.code === currentPlanCode ? (
                      <Tag color="green" className="!m-0">
                        Đang dùng
                      </Tag>
                    ) : (
                      on && <LuCheck size={16} className="text-brand-600" />
                    )}
                  </div>
                  <div className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">
                    {pr > 0 ? money(pr) : "Miễn phí"}
                    {pr > 0 && (
                      <span className="text-xs font-normal text-slate-500">
                        {" "}
                        /{cycle === "yearly" ? "năm" : "tháng"}
                      </span>
                    )}
                  </div>
                  {save > 0 && (
                    <div className="text-2xs font-semibold text-emerald-600">
                      Tiết kiệm {save}% so với trả tháng
                    </div>
                  )}
                  {p.description && (
                    <div className="mt-1 text-xs text-slate-500">
                      {p.description}
                    </div>
                  )}
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                    <li>Sản phẩm & dịch vụ: {limit(p.maxProducts)}</li>
                    <li>Nhân sự: {limit(p.maxStaff)}</li>
                    <li>Dung lượng ảnh: {storage(p.storageQuotaMb)}</li>
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-1">
                        <LuCheck
                          size={12}
                          className="mt-0.5 shrink-0 text-emerald-600"
                        />{" "}
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-600">
              SĐT liên hệ <span className="text-red-500">*</span>
            </div>
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="VD: 0901234567"
              inputMode="tel"
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-600">
              Ghi chú
            </div>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Giờ tiện nghe máy, cần xuất hoá đơn VAT…"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
