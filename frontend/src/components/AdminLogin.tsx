import { Alert, App as AntApp, Button, Divider, Form, Input, Modal } from "antd";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LuArrowLeft, LuShieldCheck, LuSmartphone, LuStore, LuX } from "react-icons/lu";
import {
  AuthProvider,
  AuthUser,
  clearLastLoginHint,
  fetchGoogleClientId,
  fetchMeFromBackend,
  getGoogleLoginUrl,
  getLastLoginHint,
  LastLoginHint,
  loginWithGoogleOneTap,
  oauthConfig,
  saveAuthUser,
} from "../data/auth";
import { siteConfig } from "../data/site";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: () => void;
          cancel: () => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
              locale?: string;
            },
          ) => void;
        };
      };
    };
  }
}

function loadGoogleGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Không tải được Google Identity Services")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được Google Identity Services"));
    document.head.appendChild(script);
  });
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.57.38-2.29V6.61H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4 3.1C6.23 6.87 8.88 4.76 12 4.76z"
      />
    </svg>
  );
}

function ZaloIcon() {
  return (
    <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-[4px] bg-[#0068FF] text-[8px] font-black tracking-tighter text-white">
      Zalo
    </span>
  );
}

export default function AdminLogin({
  redirectTo = "/admin",
  onSuccess,
  onBackToSite,
}: {
  redirectTo?: string;
  onSuccess: (user: AuthUser) => void;
  onBackToSite: () => void;
}) {
  const { message } = AntApp.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(() => searchParams.get("auth_error"));
  const [devModal, setDevModal] = useState<AuthProvider | null>(null);
  const [lastLogin, setLastLogin] = useState<LastLoginHint | null>(() => getLastLoginHint());
  const [gsiReady, setGsiReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [form] = Form.useForm();

  // Xử lý token trả về từ Google OAuth Callback (Backend -> /login?token=...)
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    let cancelled = false;
    setLoadingProvider("google");
    fetchMeFromBackend(token)
      .then((user) => {
        if (cancelled) return;
        saveAuthUser(user, token);
        setSearchParams({}, { replace: true });
        message.success(`Xin chào ${user.name}! Đăng nhập Google thành công.`);
        onSuccess(user);
      })
      .catch((err) => {
        if (cancelled) return;
        setOauthError(err instanceof Error ? err.message : "Xác thực Google thất bại");
        setSearchParams({}, { replace: true });
      })
      .finally(() => {
        if (!cancelled) setLoadingProvider(null);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, message, onSuccess]);

  // Tự động kích hoạt Google One Tap (tự nhận diện Gmail đang đăng nhập trên trình duyệt)
  useEffect(() => {
    if (searchParams.get("token")) return;
    let cancelled = false;

    (async () => {
      const clientId = await fetchGoogleClientId();
      if (cancelled || !clientId) return;
      await loadGoogleGsiScript().catch(() => null);
      if (cancelled || !window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: true,
        callback: async (response) => {
          if (!response.credential || cancelled) return;
          setOauthError(null);
          setLoadingProvider("google");
          try {
            const { token, user } = await loginWithGoogleOneTap(response.credential);
            if (cancelled) return;
            saveAuthUser(user, token);
            message.success(`Xin chào ${user.name}! Đăng nhập Google 1 chạm thành công.`);
            onSuccess(user);
          } catch (err) {
            if (cancelled) return;
            setOauthError(err instanceof Error ? err.message : "Đăng nhập Google One Tap thất bại");
          } finally {
            if (!cancelled) setLoadingProvider(null);
          }
        },
      });
      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          locale: "vi",
          width: Math.min(384, googleBtnRef.current.parentElement?.offsetWidth || 360),
        });
        setGsiReady(true);
      }
      window.google.accounts.id.prompt();
    })();

    return () => {
      cancelled = true;
      window.google?.accounts?.id?.cancel();
    };
  }, [searchParams, message, onSuccess]);

  const startGoogleOAuth = (loginHint?: string) => {
    setOauthError(null);
    setLoadingProvider("google");
    window.location.href = getGoogleLoginUrl(redirectTo, loginHint);
  };

  const startZaloOAuth = () => {
    setOauthError(null);
    if (oauthConfig.zaloOAuthUrl) {
      setLoadingProvider("zalo");
      window.location.href = oauthConfig.zaloOAuthUrl;
      return;
    }
    // Đăng nhập giả lập (không có token) chỉ dùng khi chạy dev, không có trên bản build thật.
    if (!import.meta.env.DEV) {
      message.warning("Đăng nhập Zalo chưa được cấu hình. Vui lòng dùng tài khoản Google.");
      return;
    }
    openDevModal("zalo");
  };

  const openDevModal = (provider: AuthProvider) => {
    setDevModal(provider);
    form.setFieldsValue(
      provider === "zalo"
        ? { name: "Nguyễn Minh Anh", contact: "0903 445 667" }
        : { name: "Admin recloud.vn", contact: "admin@recloud.vn" },
    );
  };

  const completeDevLogin = (values: { name: string; contact: string }) => {
    if (!devModal) return;
    const provider = devModal;
    setLoadingProvider(provider);
    setTimeout(() => {
      const user: AuthUser = {
        id: `${provider}_${Date.now()}`,
        name: values.name.trim(),
        phone: provider === "zalo" ? values.contact.trim() : undefined,
        email: provider === "google" ? values.contact.trim() : undefined,
        provider,
        avatarText: values.name.trim().slice(0, 1).toUpperCase(),
        loggedInAt: new Date().toISOString(),
      };
      saveAuthUser(user);
      setLoadingProvider(null);
      setDevModal(null);
      message.success(`Đăng nhập bằng ${provider === "zalo" ? "Zalo" : "Google"} thành công!`);
      onSuccess(user);
    }, 300);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 text-slate-900">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <button type="button" onClick={onBackToSite} className="flex items-center gap-2.5 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-black text-white shadow-sm">
            re
          </span>
          <div className="leading-tight">
            <div className="text-base font-extrabold tracking-tight text-slate-900">{siteConfig.brand}</div>
            <div className="text-[11px] text-slate-500">Cổng quản trị Store & Mini App</div>
          </div>
        </button>

        <Button icon={<LuArrowLeft size={15} />} onClick={onBackToSite}>
          Về trang chủ
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-8">
        <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/60 md:grid-cols-12">
          {/* Cột giới thiệu bên trái */}
          <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-600 to-sky-600 p-8 text-white md:col-span-5 md:flex">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <LuStore size={14} /> recloud.vn Store Studio
              </div>
              <h1 className="mt-5 text-2xl font-extrabold leading-snug">
                Quản trị Gian hàng &amp; Thiết kế Zalo Mini App trực quan
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
                Cấu hình giao diện, quản lý sản phẩm, lịch hẹn, đơn hàng và tệp khách hàng CRM tập trung trên một nền tảng.
              </p>
            </div>

            <div className="space-y-2.5 rounded-2xl bg-white/10 p-4 text-xs backdrop-blur-sm">
              <div className="flex items-center gap-2 font-semibold">
                <LuSmartphone size={15} /> Xem trước &amp; kéo-thả trực tiếp như thật
              </div>
              <div className="flex items-center gap-2 font-semibold">
                <LuShieldCheck size={15} /> Xác thực thật qua Google OAuth 2.0 &amp; JWT
              </div>
            </div>
          </div>

          {/* Cột form đăng nhập bên phải */}
          <div className="flex flex-col justify-center p-7 sm:p-10 md:col-span-7">
            <div className="mx-auto w-full max-w-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-600">Đăng nhập quản trị</div>
              <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
                Chào mừng trở lại
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Đăng nhập để truy cập bảng điều khiển Store &amp; Zalo Mini App của bạn.
              </p>

              {oauthError && (
                <Alert
                  type="error"
                  showIcon
                  closable
                  onClose={() => setOauthError(null)}
                  className="mt-4"
                  title="Không thể đăng nhập"
                  description={oauthError}
                />
              )}

              <div className="mt-7 space-y-3">
                {/* Gợi ý tài khoản đăng nhập gần nhất (last email login) */}
                {lastLogin?.provider === "google" && lastLogin.email && (
                  <div className="relative flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-2.5 pr-9 transition hover:border-brand-400 hover:bg-brand-50">
                    <button
                      type="button"
                      disabled={loadingProvider !== null}
                      onClick={() => startGoogleOAuth(lastLogin.email)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60"
                    >
                      {lastLogin.avatarUrl ? (
                        <img
                          src={lastLogin.avatarUrl}
                          alt={lastLogin.name}
                          referrerPolicy="no-referrer"
                          className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-black text-white">
                          {lastLogin.avatarText}
                        </span>
                      )}
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="truncate text-xs font-bold text-slate-900">
                          Tiếp tục với {lastLogin.name}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-slate-500">{lastLogin.email}</div>
                      </div>
                      <GoogleIcon />
                    </button>
                    <button
                      type="button"
                      title="Quên tài khoản gợi ý này"
                      onClick={() => {
                        clearLastLoginHint();
                        setLastLogin(null);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                    >
                      <LuX size={13} />
                    </button>
                  </div>
                )}

                {/* Nút Google Personalized ("Tiếp tục sử dụng dịch vụ bằng Google") */}
                <div ref={googleBtnRef} className={`flex w-full justify-center ${gsiReady ? "min-h-[40px]" : "hidden"}`} />

                {!gsiReady && (
                  <button
                    type="button"
                    disabled={loadingProvider !== null}
                    onClick={() => startGoogleOAuth()}
                    className="relative flex h-[40px] w-full items-center justify-center rounded-[4px] border border-[#dadce0] bg-white px-3 text-[14px] font-medium text-[#3c4043] transition hover:border-[#d2e3fc] hover:bg-[#f8faff] disabled:opacity-60"
                  >
                    <span className="absolute left-3 flex items-center">
                      <GoogleIcon />
                    </span>
                    <span>
                      {loadingProvider === "google"
                        ? "Đang chuyển sang Google..."
                        : "Tiếp tục sử dụng dịch vụ bằng Google"}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={loadingProvider !== null}
                  onClick={startZaloOAuth}
                  className="relative flex h-[40px] w-full items-center justify-center rounded-[4px] border border-[#dadce0] bg-white px-3 text-[14px] font-medium text-[#3c4043] transition hover:border-[#d2e3fc] hover:bg-[#f8faff] disabled:opacity-60"
                >
                  <span className="absolute left-3 flex items-center">
                    <ZaloIcon />
                  </span>
                  <span>
                    {loadingProvider === "zalo"
                      ? "Đang kết nối Zalo..."
                      : "Tiếp tục sử dụng dịch vụ bằng Zalo"}
                  </span>
                </button>
              </div>

              <Divider className="!my-6">
                <span className="text-[11px] font-medium text-slate-400">An toàn &amp; Nhanh chóng</span>
              </Divider>

              <p className="text-center text-xs leading-relaxed text-slate-500">
                Bằng việc đăng nhập, bạn đồng ý với điều khoản sử dụng dịch vụ của{" "}
                <span className="font-semibold text-slate-700">{siteConfig.brand}</span>. Cần hỗ trợ? Gọi{" "}
                <strong className="text-slate-800">{siteConfig.phoneDisplay}</strong>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Modal
        title={devModal === "zalo" ? "Xác nhận tài khoản Zalo" : "Xác nhận tài khoản Google"}
        open={devModal !== null}
        onCancel={() => setDevModal(null)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={completeDevLogin}>
          <Form.Item
            name="name"
            label="Tên hiển thị"
            rules={[{ required: true, message: "Nhập tên hiển thị" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="contact"
            label={devModal === "zalo" ? "Số điện thoại Zalo" : "Email Google"}
            rules={[{ required: true, message: "Nhập thông tin tài khoản" }]}
          >
            <Input />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loadingProvider !== null}
            className="h-10 font-bold"
          >
            Tiếp tục vào Quản trị Store
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
