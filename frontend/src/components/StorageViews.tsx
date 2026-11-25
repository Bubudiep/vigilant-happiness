import { Alert, Button, Progress, Spin, Table } from "antd";
import { useCallback, useEffect, useState } from "react";
import { LuRefreshCw } from "react-icons/lu";
import { fmtBytes } from "../data/format";
import { ApiError, fetchStorageOverview, StorageOverview, StorageStoreRow } from "../data/platform-api";

export { fmtBytes };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

/** Dung lượng: ổ đĩa server, DB, ảnh theo từng gian hàng và tổng. */
export function StorageSection() {
  const [data, setData] = useState<StorageOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchStorageOverview()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được dung lượng"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  if (!data) return error ? <Alert type="error" message={error} showIcon /> : <Spin />;

  const disk = data.disk;
  const pct = disk ? Math.round((disk.used / disk.total) * 100) : 0;
  const onDisk = data.files.onDisk.uploads.bytes + data.files.onDisk.uploadsPrivate.bytes;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Dung lượng</h2>
          <p className="text-xs text-slate-500">Cập nhật {new Date(data.generatedAt).toLocaleTimeString("vi-VN")} · số liệu theo DB, riêng "trên ổ" là đo thật (cache 5 phút)</p>
        </div>
        <Button icon={<LuRefreshCw />} loading={loading} onClick={load}>
          Làm mới
        </Button>
      </div>
      {error && <Alert type="error" message={error} showIcon />}

      {disk && (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-2 flex justify-between text-sm font-semibold text-slate-700">
            <span>Ổ đĩa server</span>
            <span>
              {fmtBytes(disk.used)} / {fmtBytes(disk.total)} · còn trống {fmtBytes(disk.free)}
            </span>
          </div>
          <Progress percent={pct} status={pct >= 90 ? "exception" : pct >= 80 ? "active" : "normal"} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ảnh gian hàng" value={fmtBytes(data.files.stores)} hint="Album + ảnh sản phẩm/banner" />
        <Stat label="Ảnh hộp thư reMini" value={fmtBytes(data.files.inbox.bytes)} hint={`${data.files.inbox.files} ảnh`} />
        <Stat label="Tổng ảnh (theo DB)" value={fmtBytes(data.files.total)} />
        <Stat label="Trên ổ / Database" value={`${fmtBytes(onDisk)} / ${data.db == null ? "—" : fmtBytes(data.db)}`} hint="uploads + uploads-private / Postgres" />
      </div>

      <Table<StorageStoreRow>
        rowKey="storeId"
        size="middle"
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        dataSource={data.stores}
        scroll={{ x: 900 }}
        rowClassName={(r) => (r.quotaBytes && r.totalBytes / r.quotaBytes >= 0.9 ? "bg-red-50" : "")}
        columns={[
          { title: "Gian hàng", render: (_, r) => (
              <div>
                <div className="font-semibold text-slate-900">{r.name}</div>
                <div className="text-xs text-slate-500">{r.customer ?? "—"} · {r.slug}</div>
              </div>
            ) },
          { title: "Gói", width: 110, render: (_, r) => r.planName ?? <span className="text-slate-400">—</span> },
          {
            title: "Hạn mức",
            width: 200,
            sorter: (a, b) => (a.quotaBytes ? a.totalBytes / a.quotaBytes : -1) - (b.quotaBytes ? b.totalBytes / b.quotaBytes : -1),
            render: (_, r) => {
              if (!r.quotaBytes) return <span className="text-slate-400">Không giới hạn</span>;
              const p = Math.round((r.totalBytes / r.quotaBytes) * 100);
              const hot = p >= 90;
              return (
                <div>
                  <div className={`text-xs font-semibold ${hot ? "text-red-600" : "text-slate-600"}`}>
                    {fmtBytes(r.totalBytes)} / {fmtBytes(r.quotaBytes)} ({p}%)
                  </div>
                  <Progress percent={Math.min(100, p)} size="small" showInfo={false} status={hot ? "exception" : "normal"} className="!mb-0" />
                </div>
              );
            },
          },
          { title: "Album", align: "right", render: (_, r) => `${fmtBytes(r.albumBytes)} (${r.albumPhotos} ảnh)` },
          { title: "Ảnh SP/banner", align: "right", render: (_, r) => `${fmtBytes(r.mediaBytes)} (${r.mediaFiles})` },
          {
            title: "Tổng",
            align: "right",
            sorter: (a, b) => a.totalBytes - b.totalBytes,
            defaultSortOrder: "descend",
            render: (_, r) => <b>{fmtBytes(r.totalBytes)}</b>,
          },
          {
            title: "% tổng",
            align: "right",
            width: 90,
            render: (_, r) => (data.files.stores ? `${((r.totalBytes / data.files.stores) * 100).toFixed(1)}%` : "—"),
          },
        ]}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}><b>Tổng</b></Table.Summary.Cell>
            <Table.Summary.Cell index={1} colSpan={4} />
            <Table.Summary.Cell index={5} align="right"><b>{fmtBytes(data.files.stores)}</b></Table.Summary.Cell>
            <Table.Summary.Cell index={6} />
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}
