import { ActionBar, Badge, formatPrice, PrimaryButton, TplHeader, TplPage, useDemoAction } from "../../_shared/kit";
import { fees, student } from "../data";

export default function FeesPage() {
  const demoAction = useDemoAction();
  const unpaid = fees.filter((f) => !f.paid);
  const total = unpaid.reduce((s, f) => s + f.amount, 0);

  return (
    <TplPage bottomSpace={68}>
      <TplHeader title="Học phí" />
      <div className="mx-4 mt-3 rounded-2xl bg-white p-4 text-sm shadow-sm">
        <div className="text-gray-500">Học sinh</div>
        <div className="font-semibold">
          {student.name} · Lớp {student.className}
        </div>
        <div className="mt-1 text-xs text-gray-400">Mã HS: {student.code}</div>
      </div>

      <div className="mx-4 mt-3 divide-y divide-gray-100 rounded-2xl bg-white shadow-sm">
        {fees.map((f) => (
          <div key={f.name} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{f.name}</div>
              <div className="text-xs text-gray-500">{formatPrice(f.amount)}</div>
            </div>
            <Badge color={f.paid ? "#16a34a" : "#dc2626"}>{f.paid ? "Đã đóng" : "Chưa đóng"}</Badge>
          </div>
        ))}
      </div>

      <ActionBar>
        <div className="flex-1">
          <div className="text-xs text-gray-500">Cần thanh toán</div>
          <div className="text-lg font-bold text-red-600">{formatPrice(total)}</div>
        </div>
        <PrimaryButton onClick={() => demoAction("Thanh toán học phí online")}>Thanh toán</PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}
