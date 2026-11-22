import { App as AntApp, Button, Form, Input, Result, Spin } from "antd";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { LuClock3, LuLogOut, LuRefreshCw, LuShieldOff, LuStore } from "react-icons/lu";
import { AccountInfo, AuthUser, fetchAccount, registerSeller } from "../data/auth";

/**
 * Chặn trang quản trị theo trạng thái người bán:
 * chưa đăng ký → form đăng ký · chờ duyệt → màn hình chờ · bị khoá → thông báo ·
 * đã kích hoạt / quản trị viên → vào trang quản trị.
 */
export default function AccountGate({
  user,
  onLogout,
  children,
}: {
  user: AuthUser;
  onLogout: () => void;
  children: (account: AccountInfo) => ReactNode;
}) {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  const load = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      setAccount(await fetchAccount());
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 401) return logoutRef.current();
      setError(e instanceof Error ? e.message : "Không kết nối được máy chủ");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (account && (account.accountStatus === "active" || account.accountStatus === "admin")) {
    return <>{children(account)}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-brand-50">
      <header className="flex h-14 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white">
            <LuStore size={16} />
          </span>
          Quản trị Store & Mini App
        </div>
        <Button type="text" icon={<LuLogOut size={15} />} onClick={onLogout}>
          Đăng xuất
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          {!account && !error && (
            <div className="flex flex-col items-center gap-3 py-10 text-sm text-slate-500">
              <Spin size="large" />
              Đang kiểm tra tài khoản…
            </div>
          )}

          {error && (
            <Result
              status="warning"
              title="Không kiểm tra được tài khoản"
              subTitle={error}
              extra={
                <Button type="primary" icon={<LuRefreshCw size={14} />} loading={checking} onClick={load}>
                  Thử lại
                </Button>
              }
            />
          )}

          {account?.accountStatus === "unregistered" && (
            <RegisterSellerForm user={user} onDone={setAccount} />
          )}

          {account?.accountStatus === "pending" && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                <LuClock3 size={30} />
              </div>
              <h2 className="mt-4 text-xl font-extrabold text-slate-900">Tài khoản đang chờ kích hoạt</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Chúng tôi đã nhận đăng ký người bán của bạn. Đội ngũ sẽ xác minh và kích hoạt trong thời gian sớm
                nhất — sau khi kích hoạt bạn có thể tạo store và thiết kế Mini App.
              </p>
              {account.customer && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-left text-sm">
                  <Row label="Cửa hàng / Công ty" value={account.customer.companyName || "—"} />
                  <Row label="Người liên hệ" value={account.customer.name} />
                  <Row label="Số điện thoại" value={account.customer.phone} />
                  <Row label="Tài khoản" value={account.email || user.email || "—"} />
                </div>
              )}
              <Button
                className="mt-5"
                size="large"
                type="primary"
                block
                icon={<LuRefreshCw size={15} />}
                loading={checking}
                onClick={load}
              >
                Kiểm tra lại trạng thái
              </Button>
            </div>
          )}

          {account?.accountStatus === "suspended" && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                <LuShieldOff size={30} />
              </div>
              <h2 className="mt-4 text-xl font-extrabold text-slate-900">Tài khoản đang tạm khoá</h2>
              <p className="mt-2 text-sm text-slate-500">
                Vui lòng liên hệ đội ngũ hỗ trợ để được mở lại quyền quản trị store.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3 py-1">
    <span className="text-slate-500">{label}</span>
    <span className="text-right font-semibold text-slate-800">{value}</span>
  </div>
);

function RegisterSellerForm({ user, onDone }: { user: AuthUser; onDone: (a: AccountInfo) => void }) {
  const { message } = AntApp.useApp();
  const [saving, setSaving] = useState(false);

  const submit = async (values: { companyName: string; name: string; phone: string; address?: string; note?: string }) => {
    setSaving(true);
    try {
      onDone(await registerSeller(values));
      message.success("Đã gửi đăng ký — vui lòng chờ kích hoạt");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Gửi đăng ký thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <LuStore size={26} />
      </div>
      <h2 className="mt-4 text-center text-xl font-extrabold text-slate-900">Đăng ký người bán</h2>
      <p className="mt-1.5 text-center text-sm text-slate-500">
        Điền thông tin cửa hàng để mở trang quản trị. Tài khoản sẽ được kích hoạt sau khi xác minh.
      </p>
      <Form
        layout="vertical"
        className="mt-6"
        requiredMark={false}
        initialValues={{ name: user.name, phone: user.phone }}
        onFinish={submit}
      >
        <Form.Item label="Tên cửa hàng / công ty" name="companyName" rules={[{ required: true, message: "Nhập tên cửa hàng" }]}>
          <Input size="large" placeholder="VD: Cà phê Nhà Gỗ" />
        </Form.Item>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Form.Item label="Người liên hệ" name="name" rules={[{ required: true, min: 2, message: "Nhập họ tên" }]}>
            <Input size="large" />
          </Form.Item>
          <Form.Item
            label="Số điện thoại Zalo"
            name="phone"
            rules={[
              { required: true, message: "Nhập số điện thoại" },
              { pattern: /^(\+?84|0)\d{9}$/, transform: (v: string) => v?.replace(/[\s.-]/g, ""), message: "Số điện thoại không hợp lệ" },
            ]}
          >
            <Input size="large" placeholder="09xx xxx xxx" />
          </Form.Item>
        </div>
        <Form.Item label="Địa chỉ" name="address">
          <Input size="large" placeholder="Số nhà, đường, quận/huyện, tỉnh/thành" />
        </Form.Item>
        <Form.Item label="Ghi chú (ngành hàng, nhu cầu…)" name="note">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
        <Button type="primary" size="large" htmlType="submit" block loading={saving} className="font-bold">
          Gửi đăng ký
        </Button>
        <p className="mt-3 text-center text-xs text-slate-400">Đăng nhập bằng {user.email || user.name}</p>
      </Form>
    </div>
  );
}
