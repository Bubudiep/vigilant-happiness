import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LuChevronLeft, LuRefreshCw, LuStore, LuX } from "react-icons/lu";
import { Page, Spinner, useNavigate, useParams } from "zmp-ui";

import { templateBasePath } from "@/templates/paths";
import { findLiveTemplate } from "@/templates";

import { fetchPublicStore, PublicStore, StoreLoadError } from "./api";
import { BlockRenderer, DocumentLike, ProductLike, RenderCtx, VoucherLike } from "./builder/blocks";
import { Icon } from "./builder/icons";
import { BuilderAuthConfig, BuilderPage, BuilderSchema, DEFAULT_BUILDER_AUTH } from "./builder/types";
import { ShopAccountButton } from "./ShopAccount";
import { getShopSession, shopFetch } from "./shop-session";
import { setStockBase } from "./stock";

/**
 * Mini App của một gian hàng: /store/:slug (mở từ link ?store=<slug>).
 * Đọc cấu hình công khai /stores/public/:slug và render đúng thiết kế ở Miniapp Studio (builderSchema).
 * Shop chưa thiết kế → mở mẫu giao diện (templateId) với dữ liệu minh hoạ.
 */
export default function StoreAppPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<PublicStore | null>(null);
  const [error, setError] = useState<StoreLoadError | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    fetchPublicStore(slug)
      .then((s) => {
        if (!alive) return;
        if (s.assetBase) setStockBase(s.assetBase);
        if (!s.builderSchema?.pages?.length && findLiveTemplate(s.templateId)) {
          navigate(templateBasePath(s.templateId), { replace: true, animate: false });
          return;
        }
        setStore(s);
      })
      .catch((e) => alive && setError(e instanceof StoreLoadError ? e : new StoreLoadError("Không tải được cửa hàng")));
    return () => {
      alive = false;
    };
  }, [slug, reload]);

  if (error)
    return (
      <Page className="flex flex-col items-center justify-center gap-3 bg-white px-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <LuStore size={28} />
        </span>
        <div className="text-base font-bold text-slate-900">{error.notFound ? "Cửa hàng không tồn tại" : "Chưa mở được cửa hàng"}</div>
        <div className="text-sm text-slate-500">{error.message}</div>
        {!error.notFound && (
          <button
            type="button"
            onClick={() => setReload((x) => x + 1)}
            className="mt-2 flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            <LuRefreshCw size={15} /> Thử lại
          </button>
        )}
      </Page>
    );

  if (!store?.builderSchema)
    return (
      <Page className="flex items-center justify-center bg-white">
        <Spinner visible />
      </Page>
    );

  return <StoreScreen store={store} schema={store.builderSchema} />;
}

/** Đo chiều cao vùng an toàn phía trên (thanh trạng thái) do Zalo cấp qua biến CSS. */
function useSafeTop() {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const read = () => setH(ref.current?.offsetHeight ?? 0);
    read();
    const t = setTimeout(read, 400);
    return () => clearTimeout(t);
  }, []);
  const probe = <div ref={ref} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 w-px" style={{ height: "var(--zaui-safe-area-inset-top, 0px)" }} />;
  return [h, probe] as const;
}

function StoreScreen({ store, schema }: { store: PublicStore; schema: BuilderSchema }) {
  const tabs = schema.pages.filter((p) => p.inTabbar).slice(0, 5);
  const [pageId, setPageId] = useState(() => (tabs[0] ?? schema.pages[0]).id);
  const page: BuilderPage = schema.pages.find((p) => p.id === pageId) ?? schema.pages[0];
  const [safeTop, probe] = useSafeTop();
  const scroller = useRef<HTMLDivElement>(null);
  const [memberLoggedIn, setMemberLoggedIn] = useState(false);
  const [authSheet, setAuthSheet] = useState<{ open: boolean; tab: "login" | "register"; reason?: string }>({ open: false, tab: "login" });
  const [toast, setToast] = useState<string | null>(null);
  const authConfig: BuilderAuthConfig = schema.auth ?? DEFAULT_BUILDER_AUTH;

  // Thẻ tích tem: khách đã đăng nhập Zalo → tem thật từ /me; chưa đăng nhập → khung tem theo cấu hình của quán
  const program = store.stampProgram?.enabled ? store.stampProgram : null;
  const [memberStamps, setMemberStamps] = useState<RenderCtx["memberStamps"]>(null);
  useEffect(() => {
    if (!program) return setMemberStamps(null);
    setMemberStamps({ count: 0, required: program.required, reward: program.reward, icon: program.icon });
    if (!getShopSession(store.slug)) return;
    shopFetch<{ stamps?: RenderCtx["memberStamps"] }>(store.slug, "/me")
      .then((me) => me.stamps && setMemberStamps(me.stamps))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.slug, program?.required, memberLoggedIn]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const goto = (id: string) => {
    setPageId(id);
    scroller.current?.scrollTo({ top: 0 });
  };

  const products: ProductLike[] = useMemo(
    () =>
      store.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        salePrice: p.salePrice,
        tag: p.tag ?? undefined,
        category: p.category,
        imageUrl: p.imageUrl ?? undefined,
      })),
    [store.products],
  );
  const vouchers: VoucherLike[] = useMemo(() => (store.vouchers ?? []).map((v) => ({ ...v, active: true })), [store.vouchers]);
  const documents: DocumentLike[] = useMemo(() => (store.documents ?? []).map((d) => ({ ...d, published: true })), [store.documents]);

  const isRoot = tabs.some((t) => t.id === page.id);
  const visibleBlocks = page.blocks.filter((b) => !b.hidden);
  const fontFamily = schema.theme.font === "system" ? "-apple-system, system-ui, sans-serif" : `'${schema.theme.font}', 'Inter', system-ui, sans-serif`;

  // Thanh tiêu đề — giống khung xem trước ở Miniapp Studio
  const appBarStyle = page.appBarStyle && page.appBarStyle !== "inherit" ? page.appBarStyle : (schema.theme.appBarStyle ?? "white");
  const first = visibleBlocks[0];
  const mergedHeader = first?.type === "header";
  const transparentBar = mergedHeader || appBarStyle === "transparent";
  const coloredBar = !mergedHeader && appBarStyle === "primary";
  const barBg = transparentBar ? "transparent" : coloredBar ? page.appBarBg || schema.theme.appBarBg || schema.theme.primary : page.appBarBg || "#ffffff";
  const autoLight = mergedHeader ? first.props.variant === "solid" : coloredBar;
  const lightText = schema.theme.appBarText === "light" ? true : schema.theme.appBarText === "dark" ? false : autoLight;
  const topBarH = safeTop + 44;

  const requireAuth = (action: keyof BuilderAuthConfig["protectedActions"], reason: string) => {
    if (!authConfig.enabled || !authConfig.protectedActions[action] || memberLoggedIn) return false;
    setAuthSheet({ open: true, tab: "login", reason: `Cần đăng nhập hội viên để: ${reason}` });
    return true;
  };

  return (
    <Page hideScrollbar className="!overflow-hidden" style={{ background: page.bgColor || schema.theme.bg, fontFamily }}>
      {probe}
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        {/* Thanh tiêu đề (chừa chỗ cụm nút ··· ✕ của Zalo bên phải) */}
        <div
          className={`${transparentBar ? "pointer-events-none absolute left-0 right-0 top-0" : "relative shrink-0"} z-20 ${
            !transparentBar && !coloredBar ? "border-b border-slate-100" : ""
          }`}
          style={{ background: barBg, color: lightText ? "#ffffff" : "#0f172a", paddingTop: safeTop }}
        >
          <div className="zalo-capsule-space flex h-11 items-center pl-3">
            {!mergedHeader && (
              <div className="pointer-events-auto flex min-w-0 items-center gap-1.5">
                {!isRoot && (
                  <button type="button" className="-ml-1" style={{ color: lightText ? "#ffffff" : "#334155" }} onClick={() => goto(tabs[0]?.id ?? page.id)}>
                    <LuChevronLeft size={22} />
                  </button>
                )}
                <span className="truncate text-[16px] font-semibold">{page.route === "/" ? schema.appName || store.name : page.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Nội dung trang */}
        <div ref={scroller} className="no-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden">
          {visibleBlocks.length === 0 && (
            <div className="m-6 rounded-2xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400" style={transparentBar ? { marginTop: topBarH + 24 } : undefined}>
              Trang đang được cập nhật
            </div>
          )}
          {visibleBlocks.map((block, i) => {
            const isMerged = mergedHeader && i === 0;
            const ownInset = isMerged || (transparentBar && i === 0 && (block.type === "header" || block.type === "profile"));
            const ctx: RenderCtx = {
              theme: schema.theme,
              products,
              documents,
              vouchers,
              auth: authConfig,
              isMemberLoggedIn: memberLoggedIn,
              memberStamps,
              onRequireMemberAuth: requireAuth,
              onOpenMemberAuth: (tab = "login") => setAuthSheet({ open: true, tab }),
              onMemberLogout: () => {
                setMemberLoggedIn(false);
                setToast("Đã đăng xuất hội viên");
              },
              editable: false,
              topInset: isMerged ? safeTop : ownInset ? topBarH : 0,
              capsuleInset: isMerged,
              onSelectItem: () => undefined,
              onEditProp: () => undefined,
              onEditItem: () => undefined,
            };
            const padTop = (block.props.paddingY ?? 0) + (transparentBar && i === 0 && !ownInset ? topBarH : 0);
            return (
              <div
                key={block.id}
                style={{ background: block.props.bgColor || undefined, paddingTop: padTop || undefined, paddingBottom: block.props.paddingY ?? undefined }}
              >
                <BlockRenderer block={block} ctx={ctx} />
              </div>
            );
          })}
          <div style={{ height: tabs.length > 0 && schema.theme.tabbarStyle === "floating" ? 96 : 16 }} />
        </div>

        {tabs.length > 0 && <TabBar schema={schema} tabs={tabs} activeId={page.id} onNavigate={goto} />}

        <ShopAccountButton
          slug={store.slug}
          primary={schema.theme.primary}
          topInset={topBarH}
          bottomOffset={tabs.length > 0 ? (schema.theme.tabbarStyle === "floating" ? 92 : 72) : 20}
        />

        {toast && (
          <div className="pointer-events-none absolute left-4 right-4 z-50 flex justify-center" style={{ top: topBarH + 16 }}>
            <div className="rounded-full bg-slate-900/90 px-4 py-2 text-xs font-semibold text-white shadow-lg">{toast}</div>
          </div>
        )}

        {authSheet.open && (
          <MemberAuthSheet
            appName={schema.appName || store.name}
            theme={schema.theme}
            auth={authConfig}
            initialTab={authSheet.tab}
            reason={authSheet.reason}
            onClose={() => setAuthSheet((s) => ({ ...s, open: false }))}
            onComplete={(mode) => {
              setMemberLoggedIn(true);
              setAuthSheet((s) => ({ ...s, open: false }));
              setToast(
                mode === "register" && authConfig.welcomePoints > 0 ? `Đăng ký thành công! +${authConfig.welcomePoints} điểm thưởng` : "Đăng nhập hội viên thành công!",
              );
            }}
          />
        )}
      </div>
    </Page>
  );
}

function TabBar({ schema, tabs, activeId, onNavigate }: { schema: BuilderSchema; tabs: BuilderPage[]; activeId: string; onNavigate: (id: string) => void }) {
  const { primary, tabbarStyle: style, tabbarBg, tabbarActiveColor, tabbarInactiveColor, tabbarRadius, tabbarShowLabel = true, tabbarBorder = true } = schema.theme;
  const floating = style === "floating";
  const bg = tabbarBg || (floating ? "#0f172a" : "#ffffff");
  const activeColor = tabbarActiveColor || (floating && !tabbarBg ? "#ffffff" : primary);
  const inactiveColor = tabbarInactiveColor || "#94a3b8";
  const radius = tabbarRadius ?? (floating ? 22 : 0);
  const safeBottom = "var(--zaui-safe-area-inset-bottom, 0px)";

  const items = tabs.map((t) => {
    const active = t.id === activeId;
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => onNavigate(t.id)}
        className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors"
        style={{ color: active ? activeColor : inactiveColor }}
      >
        {style === "indicator" && active && <span className="absolute top-0 h-[3px] w-7 rounded-b-full" style={{ background: activeColor }} />}
        {style === "minimal" ? (
          <span className="flex h-7 items-center justify-center rounded-full px-3" style={active ? { background: `${activeColor}1f` } : undefined}>
            <Icon name={t.icon} size={21} />
          </span>
        ) : (
          <Icon name={t.icon} size={tabbarShowLabel ? 22 : 24} />
        )}
        {tabbarShowLabel && <span className={active ? "font-bold" : ""}>{t.name}</span>}
      </button>
    );
  });

  if (floating)
    return (
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 px-4" style={{ paddingBottom: `calc(${safeBottom} + 12px)` }}>
        <div
          className={`pointer-events-auto flex px-1 ${tabbarBorder ? "shadow-[0_12px_30px_-10px_rgba(15,23,42,0.55)] ring-1 ring-black/5" : ""}`}
          style={{ background: bg, borderRadius: radius }}
        >
          {items}
        </div>
      </div>
    );
  return (
    <div
      className={`relative z-20 shrink-0 ${tabbarBorder ? "border-t border-slate-200/80 shadow-[0_-4px_16px_-10px_rgba(15,23,42,0.18)]" : ""}`}
      style={{ background: bg, borderTopLeftRadius: radius, borderTopRightRadius: radius, paddingBottom: `calc(${safeBottom} + 2px)` }}
    >
      <div className="flex px-1">{items}</div>
    </div>
  );
}

/** Popup đăng nhập / đăng ký hội viên (bản xem trước — chưa nối tài khoản thật). */
function MemberAuthSheet({
  appName,
  theme,
  auth,
  initialTab,
  reason,
  onClose,
  onComplete,
}: {
  appName: string;
  theme: BuilderSchema["theme"];
  auth: BuilderAuthConfig;
  initialTab: "login" | "register";
  reason?: string;
  onClose: () => void;
  onComplete: (mode: "login" | "register") => void;
}) {
  const [tab, setTab] = useState(initialTab);
  const [followOa, setFollowOa] = useState(auth.requireFollowOa);
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div className="rounded-t-[26px] bg-white px-4 pt-3 shadow-2xl" style={{ paddingBottom: "calc(var(--zaui-safe-area-inset-bottom, 0px) + 24px)" }} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-base font-extrabold text-slate-900">{auth.loginTitle || "Đăng nhập thành viên"}</div>
            <div className="mt-0.5 text-xs leading-snug text-slate-500">{auth.loginSubtitle || `Trở thành hội viên ${appName} để tích điểm & nhận ưu đãi.`}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-1.5 text-slate-500">
            <LuX size={16} />
          </button>
        </div>
        {reason && <div className="mt-2.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{reason}</div>}
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
          {(["login", "register"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-lg py-2 ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
              {t === "login" ? "Đăng nhập" : `Đăng ký ${auth.welcomePoints > 0 ? `(+${auth.welcomePoints}đ)` : ""}`}
            </button>
          ))}
        </div>
        <div className="mt-3.5 space-y-2.5">
          {auth.allowZaloQuickLogin && (
            <button
              type="button"
              onClick={() => onComplete(tab)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0068FF] py-3 text-sm font-bold text-white shadow-sm"
            >
              <span className="rounded bg-white px-1 py-0.5 text-[10px] font-black text-[#0068FF]">Zalo</span>
              {tab === "register" ? "Đăng ký 1 chạm bằng Zalo" : "Đăng nhập 1 chạm bằng Zalo"}
            </button>
          )}
          {auth.allowPhoneOtp && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
              {tab === "register" && <input type="text" placeholder="Họ và tên của bạn" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none" />}
              <input type="tel" placeholder="Số điện thoại (09xx xxx xxx)" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none" />
              <button type="button" onClick={() => onComplete(tab)} className="w-full rounded-lg py-2.5 text-sm font-bold text-white" style={{ background: theme.primary }}>
                {tab === "register" ? "Nhận mã OTP & Đăng ký" : "Tiếp tục với số điện thoại"}
              </button>
            </div>
          )}
          {auth.requireFollowOa && (
            <label className="flex items-center gap-2 rounded-lg bg-blue-50/70 px-2.5 py-2 text-xs text-slate-700">
              <input type="checkbox" checked={followOa} onChange={(e) => setFollowOa(e.target.checked)} />
              <span>
                Quan tâm Zalo OA <b>{appName}</b> để nhận thông báo ưu đãi
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
