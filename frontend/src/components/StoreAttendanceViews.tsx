import { App as AntApp, Button, Form, Input, Modal, Segmented, Spin, Table, TimePicker, Tooltip } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuFingerprint, LuLogIn, LuLogOut, LuRefreshCw } from "react-icons/lu";
import {
  type AttendanceRecord,
  type AttendanceStatus,
  deleteAttendance,
  fetchAttendance,
  punchAttendance,
  saveAttendance,
  type StaffStatusSync,
} from "../data/attendance-api";
import { ApiError } from "../data/platform-api";
import type { StoreConfig, StoreStaffItem } from "../data/store-api";
import { FilterBar, FORM_PROPS, FormFooter, FormGrid } from "./ui";

export const ATT_STATUS: Record<AttendanceStatus, { label: string; short: string; cls: string; tag: string }> = {
  present: { label: "Có mặt", short: "Có mặt", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", tag: "green" },
  late: { label: "Đi muộn", short: "Muộn", cls: "bg-amber-50 text-amber-700 ring-amber-200", tag: "orange" },
  half: { label: "Nửa công", short: "½ công", cls: "bg-sky-50 text-sky-700 ring-sky-200", tag: "blue" },
  leave: { label: "Nghỉ phép", short: "Phép", cls: "bg-violet-50 text-violet-700 ring-violet-200", tag: "purple" },
  absent: { label: "Vắng", short: "Vắng", cls: "bg-red-50 text-red-600 ring-red-200", tag: "red" },
};
const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const credit = (s: AttendanceStatus) => (s === "present" || s === "late" ? 1 : s === "half" ? 0.5 : 0);
const hours = (m: number) => (m ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : "");
const errMsg = (e: unknown, fb = "Thao tác thất bại") => (e instanceof ApiError ? e.message : fb);
/** Thứ Hai của tuần chứa ngày d */
const mondayOf = (d: Dayjs) => d.subtract((d.day() + 6) % 7, "day").startOf("day");

type EditState = { member: StoreStaffItem; date: string; record?: AttendanceRecord };
type EditForm = { status: AttendanceStatus; checkIn?: Dayjs | null; checkOut?: Dayjs | null; note?: string };

/**
 * Bảng chấm công theo tuần. Mỗi ô = 1 nhân viên × 1 ngày; bấm ô để nhập / sửa.
 * Máy chủ tự tính đi muộn (theo giờ vào ca) và đồng bộ trạng thái nhân viên theo chấm công hôm nay
 * (nghỉ phép ↔ đang làm) — kết quả trả về được đẩy lên danh sách qua `onStaffSync`.
 */
export function AttendancePanel({ store, onStaffSync }: { store: StoreConfig; onStaffSync: (list: StaffStatusSync) => void }) {
  const { message } = AntApp.useApp();
  const [week, setWeek] = useState(() => mondayOf(dayjs()));
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [today, setToday] = useState(dayjs().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [form] = Form.useForm<EditForm>();
  const editStatus = Form.useWatch("status", form);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => week.add(i, "day")), [week]);
  const from = days[0].format("YYYY-MM-DD");
  const to = days[6].format("YYYY-MM-DD");
  const members = (store.staff ?? []).filter((m) => m.status !== "quit" && !m.id.startsWith("tmp_"));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchAttendance(store.id, from, to);
      setRecords(r.records);
      setToday(r.today);
      onStaffSync(r.staff);
    } catch (e) {
      message.error(errMsg(e, "Không tải được bảng chấm công"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.id, from, to]);
  useEffect(() => {
    load();
  }, [load]);

  const map = useMemo(() => new Map((records ?? []).map((r) => [`${r.staffId}|${r.workDate}`, r])), [records]);
  const put = (rec: AttendanceRecord) =>
    setRecords((list) => [...(list ?? []).filter((x) => !(x.staffId === rec.staffId && x.workDate === rec.workDate)), rec]);

  // Hôm nay nằm trong tuần đang xem thì dùng dữ liệu tuần; không thì vẫn chấm được (máy chủ ghi theo giờ hiện tại)
  const punch = async (m: StoreStaffItem) => {
    setBusy(m.id);
    try {
      const r = await punchAttendance(store.id, m.id);
      if (r.record.workDate >= from && r.record.workDate <= to) put(r.record);
      onStaffSync(r.staff);
      message.success(`${m.name}: ${r.record.checkOut ? `chấm ra ${r.record.checkOut}` : `chấm vào ${r.record.checkIn}`}`);
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const openEdit = (member: StoreStaffItem, date: string) => {
    const record = map.get(`${member.id}|${date}`);
    setEdit({ member, date, record });
    form.setFieldsValue({
      status: record?.status ?? "present",
      checkIn: record?.checkIn ? dayjs(record.checkIn, "HH:mm") : member.shiftStart ? dayjs(member.shiftStart, "HH:mm") : null,
      checkOut: record?.checkOut ? dayjs(record.checkOut, "HH:mm") : record ? null : member.shiftEnd ? dayjs(member.shiftEnd, "HH:mm") : null,
      note: record?.note ?? "",
    });
  };

  const saveEdit = async (v: EditForm) => {
    if (!edit) return;
    try {
      const noTime = v.status === "leave" || v.status === "absent";
      const r = await saveAttendance(store.id, {
        staffId: edit.member.id,
        workDate: edit.date,
        // Có mặt / Đi muộn: để máy chủ tự quyết theo giờ vào; Nửa công / Phép / Vắng: giữ lựa chọn
        status: v.status === "present" || v.status === "late" ? undefined : v.status,
        checkIn: noTime ? null : (v.checkIn?.format("HH:mm") ?? null),
        checkOut: noTime ? null : (v.checkOut?.format("HH:mm") ?? null),
        note: v.note ?? null,
      });
      put(r.record);
      onStaffSync(r.staff);
      setEdit(null);
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const removeEdit = async () => {
    if (!edit?.record) return;
    try {
      const r = await deleteAttendance(store.id, edit.record.id);
      setRecords((list) => (list ?? []).filter((x) => x.id !== edit.record!.id));
      onStaffSync(r.staff);
      setEdit(null);
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  // Tổng hợp tuần
  const summary = (m: StoreStaffItem) => {
    let work = 0;
    let late = 0;
    let lateMin = 0;
    let absent = 0;
    let leave = 0;
    let minutes = 0;
    for (const d of days) {
      const r = map.get(`${m.id}|${d.format("YYYY-MM-DD")}`);
      if (!r) continue;
      work += credit(r.status);
      if (r.status === "late") {
        late++;
        lateMin += r.lateMinutes;
      }
      if (r.status === "absent") absent++;
      if (r.status === "leave") leave++;
      minutes += r.workedMinutes;
    }
    return { work, late, lateMin, absent, leave, minutes };
  };

  const todayCounts = useMemo(() => {
    const c = { in: 0, out: 0, leave: 0, none: 0 };
    for (const m of members) {
      const r = map.get(`${m.id}|${today}`);
      if (!r) {
        if (m.workDays.includes(dayjs(today).day())) c.none++;
      } else if (r.status === "leave" || r.status === "absent") c.leave++;
      else if (r.checkOut) c.out++;
      else c.in++;
    }
    return c;
  }, [members, map, today]);
  const todayInWeek = today >= from && today <= to;

  return (
    <div className="space-y-4">
      {/* Chấm công nhanh hôm nay */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <LuFingerprint size={16} className="text-brand-600" /> Hôm nay · {WD[dayjs(today).day()]} {dayjs(today).format("DD/MM")}
            </div>
            <div className="text-xs text-slate-500">
              {todayCounts.in} đang trong ca · {todayCounts.out} đã về · {todayCounts.leave} nghỉ · {todayCounts.none} chưa chấm
            </div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {members.map((m) => {
            const r = todayInWeek ? map.get(`${m.id}|${today}`) : undefined;
            const off = !m.workDays.includes(dayjs(today).day());
            const away = r && (r.status === "leave" || r.status === "absent");
            return (
              <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{m.name}</div>
                  <div className="truncate text-xs text-slate-500">
                    {r ? (
                      away ? (
                        <span className="text-violet-600">{ATT_STATUS[r.status].label}</span>
                      ) : (
                        <>
                          Vào <b className="tabular-nums">{r.checkIn ?? "—"}</b>
                          {r.lateMinutes > 0 && <span className="text-amber-600"> (muộn {r.lateMinutes}′)</span>}
                          {r.checkOut && (
                            <>
                              {" "}· Ra <b className="tabular-nums">{r.checkOut}</b>
                            </>
                          )}
                        </>
                      )
                    ) : off ? (
                      "Không có ca hôm nay"
                    ) : (
                      <span className="text-slate-400">Chưa chấm · ca {m.shiftStart ?? "?"}–{m.shiftEnd ?? "?"}</span>
                    )}
                  </div>
                </div>
                {!away && (
                  <Button
                    size="small"
                    type={r?.checkIn && !r.checkOut ? "default" : "primary"}
                    ghost={!(r?.checkIn && !r.checkOut)}
                    loading={busy === m.id}
                    icon={r?.checkIn ? <LuLogOut size={13} /> : <LuLogIn size={13} />}
                    onClick={() => punch(m)}
                  >
                    {r?.checkIn ? (r.checkOut ? "Chấm ra lại" : "Chấm ra") : "Chấm vào"}
                  </Button>
                )}
              </div>
            );
          })}
          {members.length === 0 && <div className="text-xs text-slate-400">Chưa có nhân viên.</div>}
        </div>
      </div>

      {/* Bảng chấm công tuần */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <FilterBar
          filters={
            <>
              <div className="flex items-center gap-1">
                <Button icon={<LuChevronLeft size={14} />} onClick={() => setWeek((w) => w.subtract(7, "day"))} aria-label="Tuần trước" />
                <div className="min-w-[150px] text-center text-sm font-semibold tabular-nums text-slate-800">
                  {days[0].format("DD/MM")} – {days[6].format("DD/MM/YYYY")}
                </div>
                <Button icon={<LuChevronRight size={14} />} onClick={() => setWeek((w) => w.add(7, "day"))} aria-label="Tuần sau" />
              </div>
              <Button onClick={() => setWeek(mondayOf(dayjs()))} disabled={todayInWeek}>
                Tuần này
              </Button>
            </>
          }
          actions={
            <>
              <div className="hidden flex-wrap gap-1 xl:flex">
                {(Object.keys(ATT_STATUS) as AttendanceStatus[]).map((k) => (
                  <span key={k} className={`rounded px-1.5 py-0.5 text-2xs font-semibold ring-1 ${ATT_STATUS[k].cls}`}>
                    {ATT_STATUS[k].label}
                  </span>
                ))}
              </div>
              <Button icon={<LuRefreshCw size={14} />} loading={loading} onClick={load} aria-label="Làm mới" />
            </>
          }
        />
        {!records ? (
          <div className="py-10 text-center">
            <Spin />
          </div>
        ) : (
          <Table<StoreStaffItem>
            rowKey="id"
            size="small"
            dataSource={members}
            pagination={false}
            tableLayout="fixed"
            scroll={{ x: 1060 }}
            columns={[
              {
                title: "Nhân viên",
                width: 170,
                fixed: "left",
                render: (_, m) => (
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{m.name}</div>
                    <div className="truncate text-xs text-slate-500">
                      {m.shiftStart ?? "?"}–{m.shiftEnd ?? "?"}
                      {m.attendanceCode ? ` · mã ${m.attendanceCode}` : ""}
                    </div>
                  </div>
                ),
              },
              ...days.map((d) => {
                const key = d.format("YYYY-MM-DD");
                const isToday = key === today;
                return {
                  title: (
                    <div className={`text-center ${isToday ? "text-brand-600" : ""}`}>
                      {WD[d.day()]} <span className="font-normal text-slate-500">{d.format("DD/MM")}</span>
                    </div>
                  ),
                  key,
                  width: 112,
                  onCell: () => ({ className: isToday ? "!bg-brand-50/40" : "" }),
                  render: (_: unknown, m: StoreStaffItem) => {
                    const r = map.get(`${m.id}|${key}`);
                    const future = key > today;
                    const off = !m.workDays.includes(d.day());
                    const st = r ? ATT_STATUS[r.status] : null;
                    return (
                      <button
                        type="button"
                        disabled={future && !r}
                        onClick={() => openEdit(m, key)}
                        className={`block w-full rounded-md px-1.5 py-1 text-center text-xs ring-1 transition ${
                          st
                            ? `${st.cls} hover:brightness-95`
                            : future
                              ? "cursor-default text-slate-300 ring-transparent"
                              : off
                                ? "text-slate-300 ring-transparent hover:ring-slate-200"
                                : "text-slate-400 ring-dashed ring-slate-200 hover:ring-brand-300 hover:text-brand-600"
                        }`}
                      >
                        {r && st ? (
                          <>
                            <div className="font-semibold">
                              {st.short}
                              {r.lateMinutes > 0 && ` ${r.lateMinutes}′`}
                              {r.source === "device" && " ·M"}
                            </div>
                            {(r.checkIn || r.checkOut) && (
                              <div className="truncate tabular-nums opacity-80">
                                {r.checkOut ? `${r.checkIn ?? "?"}–${r.checkOut}` : `Vào ${r.checkIn}`}
                              </div>
                            )}
                          </>
                        ) : future ? (
                          off ? "Nghỉ" : ""
                        ) : off ? (
                          "Nghỉ"
                        ) : (
                          "Chưa chấm"
                        )}
                      </button>
                    );
                  },
                };
              }),
              {
                title: "Tổng tuần",
                width: 130,
                fixed: "right",
                render: (_, m) => {
                  const s = summary(m);
                  return (
                    <div className="text-xs leading-5">
                      <div>
                        <b className="tabular-nums text-slate-900">{s.work}</b> công
                        {s.minutes > 0 && <span className="text-slate-500"> · {hours(s.minutes)}</span>}
                      </div>
                      <div className="text-slate-500">
                        {s.late > 0 && <span className="text-amber-600">{s.late} muộn ({s.lateMin}′) </span>}
                        {s.leave > 0 && <span className="text-violet-600">{s.leave} phép </span>}
                        {s.absent > 0 && <span className="text-red-600">{s.absent} vắng</span>}
                        {!s.late && !s.leave && !s.absent && "—"}
                      </div>
                    </div>
                  );
                },
              },
            ]}
          />
        )}
        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          <b className="font-semibold text-slate-700">Tự cập nhật trạng thái:</b> chấm “Nghỉ phép” hôm nay → nhân viên chuyển sang Nghỉ phép; có chấm vào → Đang làm; hết đợt phép → tự về Đang làm.
          <br />
          <b className="font-semibold text-slate-700">Máy chấm công (sắp có):</b> điền “Mã chấm công” của từng nhân viên trùng mã trên máy — lượt quẹt từ máy sẽ tự vào bảng này (ô có dấu ·M).
        </div>
      </div>

      <Modal
        open={!!edit}
        title={edit ? `${edit.member.name} · ${WD[dayjs(edit.date).day()]} ${dayjs(edit.date).format("DD/MM/YYYY")}` : ""}
        onCancel={() => setEdit(null)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} {...FORM_PROPS} onFinish={saveEdit}>
          <Form.Item label="Trạng thái" name="status">
            <Segmented
              block
              options={(Object.keys(ATT_STATUS) as AttendanceStatus[]).map((k) => ({ value: k, label: ATT_STATUS[k].label }))}
            />
          </Form.Item>
          {editStatus !== "leave" && editStatus !== "absent" && (
            <FormGrid>
              <Form.Item label="Giờ vào" name="checkIn" extra={edit?.member.shiftStart ? `Ca bắt đầu ${edit.member.shiftStart} · muộn quá 5′ tính đi muộn` : undefined}>
                <TimePicker format="HH:mm" minuteStep={1} className="!w-full" needConfirm={false} />
              </Form.Item>
              <Form.Item label="Giờ ra" name="checkOut">
                <TimePicker format="HH:mm" minuteStep={1} className="!w-full" needConfirm={false} />
              </Form.Item>
            </FormGrid>
          )}
          <Form.Item label="Ghi chú" name="note">
            <Input placeholder="VD: Nghỉ ốm có phép, đổi ca…" />
          </Form.Item>
          {edit?.record && (
            <div className="-mt-2 mb-3 text-xs text-slate-400">
              Nguồn: {edit.record.source === "device" ? "máy chấm công" : edit.record.source === "web" ? "nút chấm trên web" : "nhập tay"}
              {edit.record.workedMinutes > 0 && ` · làm ${hours(edit.record.workedMinutes)}`}
            </div>
          )}
          <FormFooter>
            {edit?.record && (
              <Tooltip title="Xoá ô chấm công này">
                <Button danger className="mr-auto" onClick={removeEdit}>
                  Xoá
                </Button>
              </Tooltip>
            )}
            <Button onClick={() => setEdit(null)}>Huỷ</Button>
            <Button type="primary" htmlType="submit">
              Lưu
            </Button>
          </FormFooter>
        </Form>
      </Modal>
    </div>
  );
}

