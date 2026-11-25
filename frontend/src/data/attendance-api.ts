import { api } from "./platform-api";
import type { StaffStatus } from "./store-api";

/** present = có mặt | late = đi muộn | half = nửa công | leave = nghỉ phép | absent = vắng */
export type AttendanceStatus = "present" | "late" | "half" | "leave" | "absent";

export interface AttendanceRecord {
  id: string;
  staffId: string;
  /** YYYY-MM-DD (giờ VN) */
  workDate: string;
  /** HH:mm (giờ VN) */
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  workedMinutes: number;
  /** manual | web | device */
  source: string;
  note: string | null;
}

/** Trạng thái nhân viên sau khi máy chủ đồng bộ theo chấm công hôm nay */
export type StaffStatusSync = { id: string; status: StaffStatus }[];

const base = (storeId: string) => `/stores/${storeId}/attendance`;

export const fetchAttendance = (storeId: string, from: string, to: string) =>
  api<{ today: string; records: AttendanceRecord[]; staff: StaffStatusSync }>(`${base(storeId)}?from=${from}&to=${to}`);

export const saveAttendance = (
  storeId: string,
  data: { staffId: string; workDate: string; status?: AttendanceStatus; checkIn?: string | null; checkOut?: string | null; note?: string | null },
) => api<{ record: AttendanceRecord; staff: StaffStatusSync }>(base(storeId), { method: "PUT", body: JSON.stringify(data) });

export const punchAttendance = (storeId: string, staffId: string) =>
  api<{ record: AttendanceRecord; staff: StaffStatusSync }>(`${base(storeId)}/punch`, { method: "POST", body: JSON.stringify({ staffId }) });

export const deleteAttendance = (storeId: string, id: string) =>
  api<{ id: string; staff: StaffStatusSync }>(`${base(storeId)}/${id}`, { method: "DELETE" });
