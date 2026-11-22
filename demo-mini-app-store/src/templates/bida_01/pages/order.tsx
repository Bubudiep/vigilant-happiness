import { useNavigate } from "zmp-ui";

import { CART_BAR_SPACE, CartView, TplHeader, TplPage } from "../../_shared/kit";
import { MY_TABLE, order, tableLabel } from "../data";

export default function OrderPage() {
  const navigate = useNavigate();
  return (
    <TplPage bottomSpace={CART_BAR_SPACE}>
      <TplHeader title="Món đã chọn" />
      <div className="mx-4 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        🎱 Phục vụ mang lên <b>{tableLabel(MY_TABLE)}</b> trong 5 phút. Tính chung vào hoá đơn giờ chơi.
      </div>
      <CartView
        store={order}
        aboveNav={false}
        checkoutLabel={`Gọi lên ${tableLabel(MY_TABLE)}`}
        emptyText="Chưa chọn món nào"
        emptyAction="Quay lại menu"
        onEmptyAction={() => navigate(-1)}
      />
    </TplPage>
  );
}
