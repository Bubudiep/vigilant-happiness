import { useNavigate } from "zmp-ui";

import { CART_BAR_SPACE, CartView, TplHeader, TplPage } from "../../_shared/kit";
import { cart, path } from "../data";

export default function CartPage() {
  const navigate = useNavigate();
  return (
    <TplPage tab bottomSpace={CART_BAR_SPACE}>
      <TplHeader title="Giỏ hàng" back={false} />
      <CartView
        store={cart}
        shippingFee={20000}
        freeShipFrom={300000}
        checkoutLabel="Đặt hàng"
        onEmptyAction={() => navigate(path(""), { replace: true, direction: "backward" })}
        extra={
          <div className="mx-4 mt-3 rounded-xl bg-white p-4 text-sm">
            <div className="font-semibold">🕑 Khung giờ giao</div>
            <div className="mt-1 text-gray-500">Hôm nay, 10:00 – 12:00 (nhanh nhất)</div>
          </div>
        }
      />
    </TplPage>
  );
}
