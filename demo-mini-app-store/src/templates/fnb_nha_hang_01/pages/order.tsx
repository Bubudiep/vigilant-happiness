import { useNavigate } from "zmp-ui";

import { CART_BAR_SPACE, CartView, TplHeader, TplPage } from "../../_shared/kit";
import { order } from "../data";

export default function OrderPage() {
  const navigate = useNavigate();
  return (
    <TplPage bottomSpace={CART_BAR_SPACE}>
      <TplHeader title="Món đã chọn" />
      <div className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Gọi món trước – bếp chuẩn bị sẵn khi bạn tới. Thanh toán tại nhà hàng.
      </div>
      <CartView
        store={order}
        aboveNav={false}
        checkoutLabel="Gửi gọi món"
        emptyText="Chưa có món nào"
        emptyAction="Quay lại thực đơn"
        onEmptyAction={() => navigate(-1)}
      />
    </TplPage>
  );
}
