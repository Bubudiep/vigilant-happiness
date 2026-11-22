import { TplHeader, TplPage } from "../../_shared/kit";
import { BlankCard } from "../components";
import { blanks } from "../data";

export default function ProductsPage() {
  return (
    <TplPage tab>
      <TplHeader title="Chọn sản phẩm để thêu" back={false} />
      <div className="grid grid-cols-2 gap-3 px-4 pt-3">
        {blanks.map((b) => (
          <BlankCard key={b.id} blank={b} />
        ))}
      </div>
    </TplPage>
  );
}
