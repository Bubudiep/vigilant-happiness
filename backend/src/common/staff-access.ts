import type { PrismaService } from "../prisma/prisma.service";

/**
 * Gian hàng mà email này được cấp quyền như nhân viên (StoreStaff.loginEmail, chưa nghỉ việc, có ít nhất 1 mục).
 * Trả undefined khi không có.
 */
export async function staffAccessOf(prisma: PrismaService, email: string): Promise<Record<string, string[]> | undefined> {
  const rows = await prisma.storeStaff.findMany({
    where: { loginEmail: email.trim().toLowerCase(), status: { not: "quit" } },
    select: { storeId: true, adminSections: true },
  });
  const out: Record<string, string[]> = {};
  for (const r of rows) {
    const list = Array.isArray(r.adminSections) ? (r.adminSections as unknown[]).map(String) : [];
    if (list.length) out[r.storeId] = [...new Set([...(out[r.storeId] ?? []), ...list])];
  }
  return Object.keys(out).length ? out : undefined;
}
