import { Alert, App as AntApp, Button, Card, Empty, Input, Modal, Popconfirm, Select, Steps, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { LuCopy, LuPlug, LuRefreshCw, LuRocket, LuUnplug } from "react-icons/lu";
import {
  BuildRequestRow,
  BuildStatus,
  cancelStoreBuild,
  createStoreBuild,
  disconnectStoreOa,
  fetchAdminBuilds,
  fetchStoreBuilds,
  fetchStoreOa,
  reviewBuild,
  saveStoreOa,
  StoreOaStatus,
} from "../data/inbox-api";
import { ApiError } from "../data/platform-api";
import { siteConfig } from "../data/site";
import type { StoreConfig } from "../data/store-api";

const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);
const fmt = (iso?: string | null) => (iso ? dayjs(iso).format("HH:mm DD/MM/YYYY") : "—");

export const BUILD_STATUS: Record<BuildStatus, { label: string; color: string }> = {
  pending_admin: { label: "Chờ reMini duyệt", color: "orange" },
  pending_zalo: { label: "Chờ Zalo duyệt", color: "gold" },
  published: { label: "Đã phát hành", color: "green" },
  rejected: { label: "Bị từ chối", color: "red" },
  cancelled: { label: "Đã huỷ", color: "default" },
};

// ═════════════════════════════ Thiết lập gian hàng (chủ shop) ═════════════════════════════

interface SettingsProps {
  store: StoreConfig;
  onPatch: (patch: Partial<StoreConfig>) => void;
  onSecretInput: (v: string) => void;
  onSecretSave: () => void;
}

function MiniAppCard({ store, onPatch, onSecretInput, onSecretSave }: SettingsProps) {
  return (
    <Card size="small" title="Mini App riêng của gian hàng">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">Zalo Mini App ID</div>
          <Input value={store.zaloAppId ?? ""} placeholder="VD: 3546317553033780315" onChange={(e) => onPatch({ zaloAppId: e.target.value })} />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">App Secret</div>
          <Input.Password
            autoComplete="new-password"
            placeholder={store.hasZaloAppSecret ? "•••••••• (đã lưu — nhập để thay)" : "mini.zalo.me → Cài đặt → App Secret"}
            value={store.zaloAppSecret ?? ""}
            onChange={(e) => onSecretInput(e.target.value)}
            onBlur={onSecretSave}
            onPressEnter={onSecretSave}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        App Secret lưu mã hoá, không hiển thị lại. Dùng để lấy số điện thoại khách khi đăng nhập Zalo trong Mini App của gian hàng và để làm mới token OA.
      </p>
    </Card>
  );
}

function OaCard({ store, onPatch }: SettingsProps) {
  const { message } = AntApp.useApp();
  const [status, setStatus] = useState<StoreOaStatus | null>(null);
  const [oaSecret, setOaSecret] = useState("");
  const [access, setAccess] = useState("");
  const [refresh, setRefresh] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetchStoreOa(store.id).then(setStatus).catch(() => setStatus(null));
  }, [store.id]);
  useEffect(load, [load]);

  const webhookUrl = `${siteConfig.apiUrl}${status?.webhookPath?.replace(/^\/api/, "") ?? `/oa/webhook/${store.slug}`}`;
  const ready = !!status?.configured && !!status?.webhookReady;
  const canSave = !!oaSecret.trim() || !!access.trim() || !!refresh.trim();

  const save = async () => {
    if ((access.trim() || refresh.trim()) && !(access.trim() && refresh.trim())) return message.warning("Dán cả access token và refresh token");
    setSaving(true);
    try {
      setStatus(await saveStoreOa(store.id, { oaSecret: oaSecret.trim() || undefined, accessToken: access.trim() || undefined, refreshToken: refresh.trim() || undefined }));
      setOaSecret("");
      setAccess("");
      setRefresh("");
      message.success("Đã lưu thiết lập OA");
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      size="small"
      title="Zalo OA riêng của gian hàng"
      extra={
        status && (
          <Tag color={ready ? "green" : "orange"} variant="filled">
            {ready ? "Đã kết nối" : "Chưa kết nối đầy đủ"}
          </Tag>
        )
      }
    >
      <div className="space-y-3 text-xs text-slate-600">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 font-semibold">Zalo OA ID</div>
            <Input
              value={store.zaloOaId ?? ""}
              placeholder="ID của OA"
              onChange={(e) => onPatch({ zaloOaId: e.target.value })}
            />
          </div>
          <div>
            <div className="mb-1 font-semibold">OA Secret Key (kiểm tra chữ ký webhook)</div>
            <Input.Password
              autoComplete="new-password"
              value={oaSecret}
              placeholder={status?.hasOaSecret ? "•••••••• (đã lưu — nhập để thay)" : "Zalo for Developers → Official Account → OA Secret Key"}
              onChange={(e) => setOaSecret(e.target.value)}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 font-semibold">URL webhook — dán vào Zalo for Developers</div>
          <Input
            readOnly
            value={webhookUrl}
            addonAfter={
              <LuCopy
                className="cursor-pointer"
                onClick={() => {
                  void navigator.clipboard?.writeText(webhookUrl);
                  message.success("Đã sao chép");
                }}
              />
            }
          />
          <p className="mt-1 text-xs text-slate-500">
            Phải là https, tên miền công khai. Bật sự kiện <i>user_send_text</i>, <i>user_send_image</i>, <i>follow</i>. Tin khách nhắn OA sẽ vào mục “Tin nhắn OA” của gian hàng.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input.TextArea rows={2} placeholder="Access token OA" value={access} autoComplete="off" onChange={(e) => setAccess(e.target.value)} />
          <Input.TextArea rows={2} placeholder="Refresh token OA" value={refresh} autoComplete="off" onChange={(e) => setRefresh(e.target.value)} />
        </div>
        {status && status.missing.length > 0 && <Alert type="warning" showIcon title={`Còn thiếu: ${status.missing.join(", ")}`} />}
        {status?.tokenExpiresAt && (
          <div>
            Access token hết hạn: {fmt(status.tokenExpiresAt)} {status.canRefresh ? "(tự làm mới)" : "(chưa thể tự làm mới — cần App ID + App Secret ở trên)"}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="primary" icon={<LuPlug size={14} />} loading={saving} disabled={!canSave} onClick={save}>
            Lưu thiết lập OA
          </Button>
          <Button icon={<LuRefreshCw size={14} />} onClick={load}>
            Kiểm tra lại
          </Button>
          {status?.configured && (
            <Popconfirm
              title="Gỡ token OA của gian hàng?"
              description="Tin khách nhắn OA sẽ không được trả lời từ web cho đến khi dán token mới."
              okText="Gỡ"
              onConfirm={async () => {
                try {
                  setStatus(await disconnectStoreOa(store.id));
                  message.success("Đã gỡ token OA");
                } catch (e) {
                  message.error(errMsg(e));
                }
              }}
            >
              <Button danger icon={<LuUnplug size={14} />}>
                Gỡ token
              </Button>
            </Popconfirm>
          )}
        </div>
        <p className="text-xs text-slate-500">Token lưu trong cơ sở dữ liệu backend và không hiển thị lại. Zalo chỉ cho trả lời tin tư vấn trong thời hạn sau lần khách nhắn gần nhất.</p>
      </div>
    </Card>
  );
}

function stepOf(status?: BuildStatus) {
  if (status === "pending_admin") return 1;
  if (status === "pending_zalo") return 2;
  if (status === "published") return 3;
  return 0;
}

/** Form yêu cầu build Mini App riêng + tiến trình duyệt — đặt trong cửa sổ "Xuất bản". */
export function BuildRequestPanel({ store }: { store: Pick<StoreConfig, "id" | "name"> }) {
  const { message } = AntApp.useApp();
  const [rows, setRows] = useState<BuildRequestRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [appName, setAppName] = useState(store.name);
  const [appId, setAppId] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await fetchStoreBuilds(store.id));
    } catch (e) {
      message.error(errMsg(e, "Không tải được yêu cầu build"));
    } finally {
      setLoaded(true);
    }
  }, [store.id, message]);
  useEffect(() => {
    setLoaded(false);
    void load();
  }, [load]);

  const latest = rows[0];
  const open = latest && (latest.status === "pending_admin" || latest.status === "pending_zalo");
  const failed = latest && (latest.status === "rejected" || latest.status === "cancelled");

  const send = async () => {
    setSending(true);
    try {
      await createStoreBuild(store.id, { appName: appName.trim() || undefined, appId: appId.trim() || undefined, note: note.trim() || undefined });
      message.success("Đã gửi yêu cầu — reMini sẽ xem và duyệt");
      setNote("");
      await load();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card size="small" title="Build Mini App riêng">
      <div className="space-y-3 text-xs text-slate-600">
        <Steps
          size="small"
          current={stepOf(latest?.status)}
          status={failed ? "error" : latest?.status === "published" ? "finish" : "process"}
          items={[{ title: "Gửi yêu cầu" }, { title: "reMini duyệt" }, { title: "Zalo duyệt" }, { title: "Đã phát hành" }]}
        />
        {latest && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Tag color={BUILD_STATUS[latest.status].color} variant="filled">
                {BUILD_STATUS[latest.status].label}
              </Tag>
              <b className="text-slate-800">{latest.appName}</b>
              <span className="text-slate-400">gửi {fmt(latest.createdAt)}</span>
            </div>
            {latest.adminNote && <div className="mt-1.5">Ghi chú từ reMini: <i>{latest.adminNote}</i></div>}
            {latest.status === "published" && latest.publishedUrl && (
              <div className="mt-1.5">
                Link Mini App:{" "}
                <a href={latest.publishedUrl} target="_blank" rel="noreferrer" className="break-all text-blue-600">
                  {latest.publishedUrl}
                </a>
              </div>
            )}
            {latest.status === "pending_admin" && (
              <Popconfirm
                title="Huỷ yêu cầu build?"
                okText="Huỷ yêu cầu"
                cancelText="Giữ lại"
                onConfirm={async () => {
                  try {
                    await cancelStoreBuild(store.id, latest.id);
                    await load();
                  } catch (e) {
                    message.error(errMsg(e));
                  }
                }}
              >
                <Button size="small" className="!mt-2">
                  Huỷ yêu cầu
                </Button>
              </Popconfirm>
            )}
          </div>
        )}
        {loaded && !open && (
          <div className="space-y-2">
            <p>
              Gửi yêu cầu để reMini build Mini App riêng (App ID riêng) cho gian hàng. Hệ thống lưu lại toàn bộ thiết kế, sản phẩm, slider và ảnh hiện tại làm bản yêu cầu. Sau khi reMini duyệt sẽ gửi Zalo duyệt, rồi phát hành.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={appName} maxLength={80} placeholder="Tên Mini App hiển thị trên Zalo" onChange={(e) => setAppName(e.target.value)} />
              <Input value={appId} maxLength={25} placeholder="Mini App ID (nếu đã tạo ở mini.zalo.me)" onChange={(e) => setAppId(e.target.value.replace(/\D/g, ""))} />
            </div>
            <Input.TextArea rows={2} maxLength={1000} value={note} placeholder="Ghi chú cho reMini (yêu cầu thêm, tên miền, tài khoản chủ sở hữu…)" onChange={(e) => setNote(e.target.value)} />
            <Button type="primary" icon={<LuRocket size={14} />} loading={sending} onClick={send}>
              Gửi yêu cầu build
            </Button>
          </div>
        )}
        {rows.length > 1 && (
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={rows.slice(1)}
            columns={[
              { title: "Gửi lúc", dataIndex: "createdAt", render: fmt },
              { title: "Tên app", dataIndex: "appName" },
              { title: "Trạng thái", dataIndex: "status", render: (s: BuildStatus) => <Tag color={BUILD_STATUS[s].color}>{BUILD_STATUS[s].label}</Tag> },
              { title: "Ghi chú", dataIndex: "adminNote", render: (v?: string | null) => v || "—" },
            ]}
          />
        )}
      </div>
    </Card>
  );
}

export function StoreSettingsSection(props: SettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Thiết lập gian hàng</h2>
        <p className="text-xs text-slate-500">Mini App và Zalo OA riêng của {props.store.name}. Yêu cầu build app mới gửi ở nút “Xuất bản” trong mục Miniapp.</p>
      </div>
      <MiniAppCard {...props} />
      <OaCard {...props} />
    </div>
  );
}

// ═════════════════════════════ Duyệt yêu cầu build (quản trị reMini) ═════════════════════════════

type Review = { row: BuildRequestRow; action: "approve" | "publish" | "reject"; note: string; appId: string; url: string };

export function BuildRequestsSection() {
  const { message } = AntApp.useApp();
  const [status, setStatus] = useState("open");
  const [rows, setRows] = useState<BuildRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchAdminBuilds(status === "all" ? undefined : status));
    } catch (e) {
      message.error(errMsg(e, "Không tải được danh sách"));
    } finally {
      setLoading(false);
    }
  }, [status, message]);
  useEffect(() => {
    void load();
  }, [load]);

  const open = (row: BuildRequestRow, action: Review["action"]) => setReview({ row, action, note: "", appId: row.appId ?? "", url: "" });

  const submit = async () => {
    if (!review) return;
    if (review.action === "reject" && !review.note.trim()) return message.warning("Nhập lý do từ chối");
    setSaving(true);
    try {
      await reviewBuild(review.row.id, { action: review.action, adminNote: review.note.trim() || undefined, appId: review.appId.trim() || undefined, publishedUrl: review.url.trim() || undefined });
      message.success("Đã cập nhật");
      setReview(null);
      await load();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const titles = { approve: "Duyệt — chuyển sang chờ Zalo duyệt", publish: "Đánh dấu đã phát hành", reject: "Từ chối yêu cầu" };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Yêu cầu build Mini App</h2>
          <p className="text-xs text-slate-500">Gian hàng gửi yêu cầu → bạn duyệt → gửi Zalo duyệt → phát hành.</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={status}
            onChange={setStatus}
            style={{ width: 170 }}
            options={[
              { value: "open", label: "Đang xử lý" },
              { value: "pending_admin", label: "Chờ reMini duyệt" },
              { value: "pending_zalo", label: "Chờ Zalo duyệt" },
              { value: "published", label: "Đã phát hành" },
              { value: "rejected", label: "Bị từ chối" },
              { value: "all", label: "Tất cả" },
            ]}
          />
          <Button icon={<LuRefreshCw size={14} />} onClick={load} loading={loading} />
        </div>
      </div>
      <Table
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 820 }}
        locale={{ emptyText: <Empty description="Chưa có yêu cầu" /> }}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        columns={[
          {
            title: "Gian hàng",
            render: (_, r) => (
              <div>
                <div className="font-semibold">{r.store?.name}</div>
                <div className="text-xs text-slate-500">{r.store?.customer ? `${r.store.customer.companyName || r.store.customer.name} · ${r.store.customer.phone}` : "—"}</div>
              </div>
            ),
          },
          {
            title: "Mini App",
            render: (_, r) => (
              <div>
                <div>{r.appName}</div>
                <div className="font-mono text-xs text-slate-500">{r.appId || "chưa có App ID"}</div>
                {r.note && <div className="max-w-[240px] text-xs italic text-slate-500">{r.note}</div>}
              </div>
            ),
          },
          { title: "Trạng thái", dataIndex: "status", render: (s: BuildStatus) => <Tag color={BUILD_STATUS[s].color}>{BUILD_STATUS[s].label}</Tag> },
          { title: "Gửi lúc", dataIndex: "createdAt", render: fmt },
          {
            title: "",
            align: "right",
            render: (_, r) => (
              <div className="flex justify-end gap-1.5">
                {r.status === "pending_admin" && (
                  <Button size="small" type="primary" onClick={() => open(r, "approve")}>
                    Duyệt
                  </Button>
                )}
                {r.status === "pending_zalo" && (
                  <Button size="small" type="primary" onClick={() => open(r, "publish")}>
                    Đã phát hành
                  </Button>
                )}
                {(r.status === "pending_admin" || r.status === "pending_zalo") && (
                  <Button size="small" danger onClick={() => open(r, "reject")}>
                    Từ chối
                  </Button>
                )}
                {r.status === "published" && r.publishedUrl && (
                  <a href={r.publishedUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600">
                    Mở app
                  </a>
                )}
              </div>
            ),
          },
        ]}
      />
      <Modal title={review ? titles[review.action] : ""} open={!!review} onCancel={() => setReview(null)} onOk={submit} confirmLoading={saving} okText="Xác nhận" destroyOnHidden>
        {review && (
          <div className="space-y-3 pt-2 text-xs text-slate-600">
            <div>
              <b>{review.row.store?.name}</b> — {review.row.appName}
            </div>
            {review.action === "publish" && (
              <>
                <Input value={review.appId} maxLength={25} placeholder="Mini App ID đã phát hành" onChange={(e) => setReview({ ...review, appId: e.target.value.replace(/\D/g, "") })} />
                <Input value={review.url} placeholder="Link Mini App (để trống = tự tạo từ App ID)" onChange={(e) => setReview({ ...review, url: e.target.value })} />
              </>
            )}
            <Input.TextArea
              rows={3}
              maxLength={1000}
              value={review.note}
              placeholder={review.action === "reject" ? "Lý do từ chối (gian hàng sẽ thấy) *" : "Ghi chú cho gian hàng (không bắt buộc)"}
              onChange={(e) => setReview({ ...review, note: e.target.value })}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
