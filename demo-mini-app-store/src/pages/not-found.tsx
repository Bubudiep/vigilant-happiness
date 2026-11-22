import { Page, useNavigate } from "zmp-ui";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Page className="flex flex-col items-center justify-center gap-3 bg-white px-8 text-center">
      <div className="text-5xl">🔍</div>
      <div className="text-lg font-semibold">Không tìm thấy trang</div>
      <p className="text-sm text-gray-500">Mẫu bạn tìm có thể chưa sẵn sàng hoặc đường dẫn không đúng.</p>
      <button
        onClick={() => navigate("/", { replace: true })}
        className="mt-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white"
      >
        Xem danh sách mẫu
      </button>
    </Page>
  );
}
