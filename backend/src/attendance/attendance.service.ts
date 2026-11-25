import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { StoreAttendance, StoreStaff } from "@prisma/client";
import type { AuthContext } from "../common/guards/app-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { StoresService } from "../stores/stores.service";

export const ATTENDANCE_STATUS = ["present", "late", "half", "leave", "absent"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];
/** Đến sau giờ vào ca quá số phút này → "đi muộn" */
export const LATE_GRACE_MIN = 5;

const VN_OFFSET = 7 * 60 * 60 * 1000;
/** Ngày YYYY-MM-DD theo giờ Việt Nam */
export const vnDate = (d: Date) => new Date(d.getTime() + VN_OFFSET).toISOString().slice(0, 10);
/** Giờ HH:mm theo giờ Việt Nam */
export const vnTime = (d: Date) => new Date(d.getTime() + VN_OFFSET).toISOString().slice(11, 16);
/** "YYYY-MM-DD" + "HH:mm" (giờ VN) → Date */
export const fromVn = (date: string, time: string) => new Date(new Date(`${date}T${time}:00Z`).getTime() - VN_OFFSET);
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type AttendanceInput = {
  staffId: string;
  workDate: string;
  status?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  note?: string | null;
};

/**
 * Chấm công theo ngày cho nhân sự của gian hàng.
 * - Có giờ vào → tự tính đi muộn (so với giờ vào ca của nhân viên) và số phút làm.
 * - Trạng thái nhân viên tự cập nhật theo bảng chấm công của HÔM NAY:
 *   nghỉ phép → "Nghỉ phép"; có mặt / đi muộn / nửa công → "Đang làm". Nhân viên "Đã nghỉ việc" không bị đổi.
 * - `punch()` là điểm nhận dữ liệu chung cho nút chấm trên web và (sau này) máy chấm công.
 */
@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  serialize(a: StoreAttendance) {
    return {
      id: a.id,
      staffId: a.staffId,
      workDate: a.workDate,
      checkIn: a.checkInAt ? vnTime(a.checkInAt) : null,
      checkOut: a.checkOutAt ? vnTime(a.checkOutAt) : null,
      status: a.status as AttendanceStatus,
      lateMinutes: a.lateMinutes,
      workedMinutes: a.workedMinutes,
      source: a.source,
      note: a.note,
    };
  }

  async list(auth: AuthContext, storeId: string, from: string, to: string) {
    await this.stores.ensureAccess(auth, storeId);
    if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) throw new BadRequestException("Khoảng ngày không hợp lệ");
    const days = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
    if (days > 62) throw new BadRequestException("Tối đa 62 ngày mỗi lần xem");
    const staff = await this.reconcile(storeId);
    const records = await this.prisma.storeAttendance.findMany({
      where: { storeId, workDate: { gte: from, lte: to } },
      orderBy: [{ workDate: "asc" }],
    });
    return { today: vnDate(new Date()), records: records.map((r) => this.serialize(r)), staff };
  }

  /** Nhập / sửa tay một ô chấm công */
  async upsert(auth: AuthContext, storeId: string, body: AttendanceInput) {
    await this.stores.ensureAccess(auth, storeId);
    const member = await this.member(storeId, String(body?.staffId ?? ""));
    const workDate = String(body.workDate ?? "");
    if (!DATE_RE.test(workDate)) throw new BadRequestException("Ngày không hợp lệ");
    const checkIn = this.time(body.checkIn, "Giờ vào");
    const checkOut = this.time(body.checkOut, "Giờ ra");
    if (body.status !== undefined && !(ATTENDANCE_STATUS as readonly string[]).includes(String(body.status))) {
      throw new BadRequestException("Trạng thái không hợp lệ");
    }
    const absentLike = body.status === "leave" || body.status === "absent";
    const checkInAt = absentLike || !checkIn ? null : fromVn(workDate, checkIn);
    const checkOutAt = absentLike || !checkOut ? null : fromVn(workDate, checkOut);
    if (checkInAt && checkOutAt && checkOutAt < checkInAt) throw new BadRequestException("Giờ ra phải sau giờ vào");
    const computed = this.compute(member, checkInAt, checkOutAt, body.status as AttendanceStatus | undefined);
    const data = { checkInAt, checkOutAt, ...computed, note: body.note?.trim() || null, source: "manual" };
    const rec = await this.prisma.storeAttendance.upsert({
      where: { staffId_workDate: { staffId: member.id, workDate } },
      create: { storeId, staffId: member.id, workDate, ...data },
      update: data,
    });
    return { record: this.serialize(rec), staff: await this.reconcile(storeId) };
  }

  async remove(auth: AuthContext, storeId: string, id: string) {
    await this.stores.ensureAccess(auth, storeId);
    const rec = await this.prisma.storeAttendance.findFirst({ where: { id, storeId } });
    if (!rec) throw new NotFoundException("Không tìm thấy dòng chấm công");
    await this.prisma.storeAttendance.delete({ where: { id } });
    // Xoá ô "nghỉ phép" của hôm nay → nhân viên đi làm lại (trừ khi đã nghỉ việc)
    if (rec.status === "leave" && rec.workDate === vnDate(new Date())) {
      await this.prisma.storeStaff.updateMany({ where: { id: rec.staffId, status: "leave" }, data: { status: "active" } });
    }
    return { id, deleted: true, staff: await this.reconcile(storeId) };
  }

  /** Nút "Chấm vào / Chấm ra" trên web quản trị */
  async punchFromWeb(auth: AuthContext, storeId: string, staffId: string) {
    await this.stores.ensureAccess(auth, storeId);
    const member = await this.member(storeId, staffId);
    return this.punch(storeId, member, new Date(), "web");
  }

  /**
   * Ghi một lần quẹt: chưa có giờ vào → giờ vào; đã có → giờ ra (lần quẹt sau cùng trong ngày).
   * Dùng chung cho máy chấm công: tìm nhân viên theo `attendanceCode` rồi gọi hàm này.
   */
  async punch(storeId: string, member: StoreStaff, at: Date, source: "web" | "device", deviceId?: string) {
    const workDate = vnDate(at);
    const cur = await this.prisma.storeAttendance.findUnique({ where: { staffId_workDate: { staffId: member.id, workDate } } });
    const checkInAt = cur?.checkInAt && cur.checkInAt <= at ? cur.checkInAt : at;
    const checkOutAt = cur?.checkInAt && cur.checkInAt <= at ? at : (cur?.checkOutAt ?? null);
    // Ngày đã đánh dấu nghỉ phép / vắng mà vẫn quẹt → tính là đi làm
    const keep = cur && cur.status === "half" ? "half" : undefined;
    const computed = this.compute(member, checkInAt, checkOutAt, keep);
    const data = { checkInAt, checkOutAt, ...computed, source, deviceId: deviceId ?? cur?.deviceId ?? null };
    const rec = await this.prisma.storeAttendance.upsert({
      where: { staffId_workDate: { staffId: member.id, workDate } },
      create: { storeId, staffId: member.id, workDate, ...data },
      update: data,
    });
    return { record: this.serialize(rec), staff: await this.reconcile(storeId) };
  }

  /**
   * Đồng bộ trạng thái nhân viên theo chấm công hôm nay. Trả về [{ id, status }] của mọi nhân viên
   * để web cập nhật danh sách.
   *  - Hôm nay "nghỉ phép" → leave
   *  - Hôm nay có mặt / muộn / nửa công → active
   *  - Đang "nghỉ phép" do chấm công (từng có ngày nghỉ phép) nhưng hôm nay không còn nghỉ → active
   */
  async reconcile(storeId: string) {
    const today = vnDate(new Date());
    const [staff, todays] = await Promise.all([
      this.prisma.storeStaff.findMany({ where: { storeId }, select: { id: true, status: true } }),
      this.prisma.storeAttendance.findMany({ where: { storeId, workDate: today }, select: { staffId: true, status: true } }),
    ]);
    const byStaff = new Map(todays.map((t) => [t.staffId, t.status]));
    const onLeaveNoRecord = staff.filter((s) => s.status === "leave" && byStaff.get(s.id) !== "leave").map((s) => s.id);
    // Chỉ tự đưa về "Đang làm" nếu đợt nghỉ được ghi trong bảng chấm công (ngày nghỉ phép gần nhất đã qua)
    const leaveHistory = onLeaveNoRecord.length
      ? await this.prisma.storeAttendance.groupBy({
          by: ["staffId"],
          where: { storeId, staffId: { in: onLeaveNoRecord }, status: "leave" },
          _max: { workDate: true },
        })
      : [];
    const endedLeave = new Set(leaveHistory.filter((h) => (h._max.workDate ?? "") < today).map((h) => h.staffId));

    const updates: { id: string; status: string }[] = [];
    for (const s of staff) {
      if (s.status === "quit") continue;
      const t = byStaff.get(s.id);
      let next = s.status;
      if (t === "leave") next = "leave";
      else if (t === "present" || t === "late" || t === "half") next = "active";
      else if (s.status === "leave" && endedLeave.has(s.id)) next = "active";
      if (next !== s.status) updates.push({ id: s.id, status: next });
    }
    if (updates.length) {
      await this.prisma.$transaction(updates.map((u) => this.prisma.storeStaff.update({ where: { id: u.id }, data: { status: u.status } })));
    }
    const changed = new Map(updates.map((u) => [u.id, u.status]));
    return staff.map((s) => ({ id: s.id, status: changed.get(s.id) ?? s.status }));
  }

  // ───────────── nội bộ ─────────────

  private async member(storeId: string, staffId: string) {
    const m = await this.prisma.storeStaff.findFirst({ where: { id: staffId, storeId } });
    if (!m) throw new NotFoundException("Không tìm thấy nhân viên");
    return m;
  }

  private time(v: unknown, label: string) {
    if (v === undefined || v === null || v === "") return null;
    const s = String(v);
    if (!TIME_RE.test(s)) throw new BadRequestException(`${label} phải dạng HH:mm`);
    return s;
  }

  /** Tính đi muộn / số phút làm; `forced` = trạng thái người dùng chọn (ưu tiên nếu có) */
  private compute(member: StoreStaff, checkInAt: Date | null, checkOutAt: Date | null, forced?: AttendanceStatus) {
    let lateMinutes = 0;
    if (checkInAt && member.shiftStart && TIME_RE.test(member.shiftStart)) {
      const diff = toMin(vnTime(checkInAt)) - toMin(member.shiftStart);
      if (diff > LATE_GRACE_MIN) lateMinutes = diff;
    }
    const workedMinutes = checkInAt && checkOutAt ? Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60_000)) : 0;
    const status: AttendanceStatus = forced ?? (checkInAt ? (lateMinutes ? "late" : "present") : "absent");
    return { status, lateMinutes: status === "leave" || status === "absent" ? 0 : lateMinutes, workedMinutes };
  }
}
