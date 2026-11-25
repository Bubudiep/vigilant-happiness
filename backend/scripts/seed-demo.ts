/**
 * Sinh dữ liệu mẫu để xem giao diện quản trị khi DB dev còn trống.
 *
 *   npm run seed:demo            → xoá dữ liệu mẫu cũ rồi tạo lại
 *   npm run seed:demo -- --clean → chỉ xoá dữ liệu mẫu
 *
 * Chỉ đụng tới bản ghi có dấu "mẫu", không sửa dữ liệu thật:
 *   khách nền tảng email *@demo.remini.vn · store slug demo-* · lead source "demo" ·
 *   gói code demo_* · voucher gói DEMO* · hội thoại externalKey demo:*
 * Từ chối chạy khi NODE_ENV=production.
 */
import { hasFlag, newPrisma } from "./_common";
import type { Prisma } from "@prisma/client";

if (process.env.NODE_ENV === "production") {
  console.error("✖ Không chạy seed:demo trên production.");
  process.exit(1);
}

const prisma = newPrisma();
const EMAIL = "@demo.remini.vn";

// PRNG cố định → mỗi lần chạy ra cùng một bộ dữ liệu
let seed = 20261125;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const int = (min: number, max: number) => Math.floor(min + rnd() * (max - min + 1));
const DAY = 86_400_000;
const daysFromNow = (d: number, hour = 9, minute = 0) => {
  const t = new Date(Date.now() + d * DAY);
  t.setHours(hour, minute, 0, 0);
  return t;
};

const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô"];
const DEM = ["Thị", "Văn", "Minh", "Ngọc", "Thanh", "Quốc", "Thu", "Hữu", "Bảo", "Gia"];
const TEN = ["An", "Bình", "Châu", "Dũng", "Hà", "Hùng", "Lan", "Linh", "Mai", "Nam", "Phương", "Quân", "Thảo", "Trang", "Tuấn", "Vy"];
const fullName = () => `${pick(HO)} ${pick(DEM)} ${pick(TEN)}`;
const phone = () => `09${int(10000000, 99999999)}`;

async function clean() {
  const customers = await prisma.platformCustomer.findMany({ where: { email: { endsWith: EMAIL } }, select: { id: true } });
  const ids = customers.map((c) => c.id);
  const r = {
    conversations: (await prisma.conversation.deleteMany({ where: { externalKey: { startsWith: "demo:" } } })).count,
    stores: (await prisma.store.deleteMany({ where: { slug: { startsWith: "demo-" } } })).count,
    leads: (await prisma.consultationLead.deleteMany({ where: { source: "demo" } })).count,
    // xoá khách → cascade gói đăng ký, dự án, ticket, khoản nợ, việc chăm sóc, nhân sự
    customers: (await prisma.platformCustomer.deleteMany({ where: { id: { in: ids } } })).count,
    vouchers: (await prisma.platformVoucher.deleteMany({ where: { code: { startsWith: "DEMO" } } })).count,
    plans: (await prisma.subscriptionPlan.deleteMany({ where: { code: { startsWith: "demo_" } } })).count,
  };
  console.log("Đã xoá dữ liệu mẫu:", r);
}

async function seedPlatform() {
  const plans = await Promise.all(
    [
      { code: "demo_basic", name: "Cơ bản", priceMonthly: 299_000, priceYearly: 2_990_000, maxProducts: 100, maxStaff: 5, storageQuotaMb: 2048, sortOrder: 1, features: ["1 Mini App", "100 sản phẩm", "2GB ảnh"] },
      { code: "demo_pro", name: "Chuyên nghiệp", priceMonthly: 699_000, priceYearly: 6_990_000, maxProducts: 1000, maxStaff: 15, storageQuotaMb: 10240, sortOrder: 2, features: ["App ID riêng", "1.000 sản phẩm", "10GB ảnh", "Zalo OA riêng"] },
      { code: "demo_business", name: "Doanh nghiệp", priceMonthly: 1_490_000, priceYearly: 14_900_000, maxStores: 5, maxProducts: 10000, maxStaff: 50, storageQuotaMb: null, sortOrder: 3, features: ["5 gian hàng", "Không giới hạn ảnh", "Hỗ trợ ưu tiên"] },
    ].map((p) => prisma.subscriptionPlan.create({ data: { description: `Gói ${p.name} (dữ liệu mẫu)`, ...p } })),
  );

  await prisma.platformVoucher.createMany({
    data: [
      { code: "DEMOKHAI20", title: "Khai trương giảm 20%", discountType: "percent", discountValue: 20, maxDiscount: 500_000, quantity: 50, usedCount: 12, endDate: daysFromNow(30) },
      { code: "DEMONAM500", title: "Giảm 500k gói năm", discountType: "amount", discountValue: 500_000, billingCycle: "yearly", minAmount: 2_000_000, quantity: 20, usedCount: 3, endDate: daysFromNow(60) },
      { code: "DEMOHET", title: "Voucher đã hết hạn", discountType: "percent", discountValue: 10, quantity: 100, usedCount: 100, startDate: daysFromNow(-60), endDate: daysFromNow(-5), active: false },
    ],
  });

  const companies = [
    { companyName: "Cà phê Mộc Hương", industry: "fnb_cafe_01" },
    { companyName: "Lotus Spa Quận 3", industry: "spa_01" },
    { companyName: "Gentle Barber", industry: "cat_toc_01" },
    { companyName: "Thời trang LUMI", industry: "thoi_trang_01" },
    { companyName: "Mây Nail Studio", industry: "nail_01" },
    { companyName: "Nhà sách Tri Thức", industry: null },
    { companyName: null, industry: null },
    { companyName: "Bếp Nhà Lan", industry: "fnb_cafe_01" },
    { companyName: "Phòng khám Siêu âm BabySee 5D", industry: "sieu_am_5d_01" },
    { companyName: "Sao Billiards & Karaoke", industry: "fnb_cafe_01" },
  ];
  const customers = [];
  for (let i = 0; i < companies.length; i++) {
    const name = fullName();
    const c = await prisma.platformCustomer.create({
      data: {
        name,
        companyName: companies[i].companyName,
        phone: phone(),
        email: `khach${i + 1}${EMAIL}`,
        address: pick(["12 Lê Lợi, Q.1, TP.HCM", "45 Trần Phú, Hà Đông, Hà Nội", "8 Nguyễn Văn Linh, Đà Nẵng", "102 Hai Bà Trưng, Q.3, TP.HCM"]),
        status: i === 6 ? "pending" : i === 5 ? "suspended" : "active",
        note: i === 0 ? "Khách quen, giới thiệu thêm 2 khách" : null,
        staff: i < 3 ? { create: [{ name: fullName(), phone: phone(), role: "manager" }, { name: fullName(), phone: phone() }] } : undefined,
      },
    });
    customers.push({ ...c, industry: companies[i].industry });
  }

  // Gói đăng ký: đang dùng / sắp hết hạn / đã hết hạn / dùng thử / đã huỷ
  const subs = [];
  const subPlan = [
    [0, 1, "active", 200, "yearly"],
    [1, 0, "active", 9, "monthly"],
    [2, 1, "trial", 10, "monthly"],
    [3, 0, "expired", -12, "monthly"],
    [4, 2, "active", 320, "yearly"],
    [5, 0, "cancelled", -40, "monthly"],
    [7, 0, "active", 25, "monthly"],
    [8, 1, "active", 150, "yearly"],
  ] as const;
  for (const [ci, pi, status, days, cycle] of subPlan) {
    const plan = plans[pi];
    const price = cycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
    const discount = ci === 0 ? 500_000 : 0;
    subs[ci] = await prisma.subscription.create({
      data: {
        customerId: customers[ci].id,
        planId: plan.id,
        billingCycle: cycle,
        status,
        pricePaid: status === "trial" ? 0 : price - discount,
        voucherCode: discount ? "DEMONAM500" : null,
        discountAmount: discount,
        startedAt: daysFromNow(days - (cycle === "yearly" ? 365 : 30)),
        expiresAt: daysFromNow(days),
      },
    });
  }

  // Dự án + mốc
  const MS = ["Chốt yêu cầu & báo giá", "Thiết kế giao diện", "Lập trình & nhập dữ liệu", "Kiểm thử cùng khách", "Gửi Zalo duyệt", "Bàn giao & hướng dẫn"];
  const projects = [
    [0, "Mini App đặt món Mộc Hương", "live", 6],
    [1, "Mini App đặt lịch Lotus Spa", "zalo_review", 4],
    [2, "Mini App Gentle Barber", "developing", 2],
    [4, "Mini App Mây Nail", "designing", 1],
    [7, "Mini App Bếp Nhà Lan", "consulting", 0],
    [8, "Mini App Siêu âm BabySee 5D", "live", 6],
  ] as const;
  const projectIds: string[] = [];
  for (const [ci, name, status, done] of projects) {
    const p = await prisma.project.create({
      data: {
        customerId: customers[ci].id,
        name,
        templateId: customers[ci].industry,
        status,
        progress: Math.round((done / MS.length) * 100),
        startDate: daysFromNow(-30 + ci * 3),
        dueDate: daysFromNow(10 + ci * 4),
        milestones: {
          create: MS.map((title, i) => ({
            title,
            sortOrder: i,
            status: i < done ? "done" : i === done ? "doing" : "todo",
            doneAt: i < done ? daysFromNow(-20 + i * 3) : null,
            dueDate: daysFromNow(-20 + i * 5),
          })),
        },
      },
    });
    projectIds.push(p.id);
  }

  // Ticket hỗ trợ
  const tickets = [
    [0, "Không nhận được thông báo đơn hàng mới", "technical", "high", "open"],
    [0, "Muốn thêm mục khuyến mãi cuối tuần", "feature", "normal", "in_progress"],
    [1, "Zalo yêu cầu bổ sung ảnh chụp màn hình", "zalo_review", "high", "waiting_customer"],
    [2, "Hỏi về hoá đơn tháng 11", "billing", "low", "resolved"],
    [4, "Đổi logo và màu chủ đạo", "feature", "normal", "closed"],
  ] as const;
  for (let i = 0; i < tickets.length; i++) {
    const [ci, subject, category, priority, status] = tickets[i];
    const createdAt = daysFromNow(-8 + i, 10 + i);
    await prisma.supportTicket.create({
      data: {
        code: `DEMO-TK${String(i + 1).padStart(3, "0")}`,
        customerId: customers[ci].id,
        projectId: projectIds[Math.min(ci, projectIds.length - 1)],
        subject,
        category,
        priority,
        status,
        createdAt,
        lastReplyAt: daysFromNow(-6 + i, 15),
        resolvedAt: status === "resolved" || status === "closed" ? daysFromNow(-2) : null,
        messages: {
          create: [
            { authorType: "customer", authorName: customers[ci].name, body: `${subject}. Nhờ reMini kiểm tra giúp.`, createdAt },
            ...(status !== "open" ? [{ authorType: "staff", authorName: "Hỗ trợ reMini", body: "Đã nhận, bên mình đang kiểm tra và sẽ phản hồi sớm.", createdAt: new Date(createdAt.getTime() + 3_600_000) }] : []),
          ],
        },
      },
    });
  }

  // Khoản nợ: chưa trả / trả một phần / quá hạn / đã trả
  const debts = [
    [1, "Phí triển khai Mini App (đợt 2)", 6_000_000, 12, [2_000_000]],
    [2, "Gia hạn gói Chuyên nghiệp", 6_990_000, -5, []],
    [3, "Phí thiết kế banner", 1_500_000, -20, [500_000]],
    [0, "Phí triển khai Mini App", 8_000_000, -30, [4_000_000, 4_000_000]],
    [7, "Đặt cọc dự án", 3_000_000, 20, []],
  ] as const;
  for (const [ci, title, amount, due, pays] of debts) {
    await prisma.debt.create({
      data: {
        customerId: customers[ci].id,
        title,
        amount,
        dueDate: daysFromNow(due),
        payments: { create: pays.map((a, i) => ({ amount: a, paidAt: daysFromNow(-25 + i * 10), method: pick(["Chuyển khoản", "Tiền mặt"]) })) },
      },
    });
  }

  // Lịch gọi lại + nhận tư vấn
  const SLOTS = ["08:00-10:00", "10:00-12:00", "13:30-15:30", "15:30-17:30", "19:00-21:00"];
  const INDUSTRY = ["Quán cà phê", "Spa", "Thời trang", "Nhà hàng", "Tiệm tóc", "Phòng khám", "Giáo dục"];
  for (let i = 0; i < 14; i++) {
    const callback = i % 2 === 0;
    await prisma.consultationLead.create({
      data: {
        name: fullName(),
        phone: phone(),
        industry: pick(INDUSTRY),
        note: pick(["Muốn làm Mini App đặt hàng", "Cần tư vấn gói giá", "Hỏi về tích điểm thành viên", "Đã có OA, muốn gắn Mini App", null]),
        source: "demo",
        requestType: callback ? "callback" : "consultation",
        callbackDate: callback ? daysFromNow(int(-2, 5), 0) : null,
        callbackSlot: callback ? pick(SLOTS) : null,
        phoneVerified: rnd() > 0.4,
        status: pick(["NEW", "NEW", "NEW", "CONTACTED", "CONVERTED", "ARCHIVED"] as const),
        staffNote: rnd() > 0.6 ? "Đã gọi, hẹn gửi báo giá" : null,
        createdAt: daysFromNow(-int(0, 10), int(8, 20)),
      },
    });
  }

  // Hộp thư reMini + việc chăm sóc
  for (let i = 0; i < 5; i++) {
    const c = customers[i];
    const msgs = [
      ["in", "Chào reMini, mình muốn hỏi về gói Chuyên nghiệp"],
      ["out", "Chào anh/chị, gói Chuyên nghiệp có App ID riêng và Zalo OA riêng ạ."],
      ["in", pick(["Cho mình xin báo giá chi tiết nhé", "Bên mình có hỗ trợ nhập sản phẩm không?", "Khi nào app được Zalo duyệt vậy?"])],
    ] as const;
    const last = msgs[msgs.length - 1];
    await prisma.conversation.create({
      data: {
        channel: i % 2 ? "oa" : "miniapp",
        externalKey: `demo:${i}`,
        customerId: c.id,
        displayName: c.name,
        phone: c.phone,
        unreadStaff: i < 3 ? int(1, 3) : 0,
        lastMessageAt: daysFromNow(-i, 9 + i),
        lastPreview: last[1],
        status: i === 4 ? "closed" : "open",
        messages: { create: msgs.map(([direction, body], k) => ({ direction, body, staffLabel: direction === "out" ? "Hỗ trợ reMini" : null, createdAt: daysFromNow(-i, 8 + i, k * 7) })) },
      },
    });
  }
  await prisma.careTask.createMany({
    data: [
      { customerId: customers[1].id, title: "Gọi nhắc gia hạn gói", dueAt: daysFromNow(0, 10) },
      { customerId: customers[3].id, title: "Hỏi thăm sau khi hết hạn, mời gia hạn", dueAt: daysFromNow(-1, 15) },
      { customerId: customers[0].id, title: "Gửi hướng dẫn tạo voucher", dueAt: daysFromNow(2, 9), note: "Khách muốn chạy khuyến mãi cuối tuần" },
      { customerId: customers[2].id, title: "Demo tính năng hàng chờ", dueAt: daysFromNow(-3, 14), doneAt: daysFromNow(-3, 16) },
    ],
  });

  return { customers, subs };
}

type AlbumKind = { key: string; label: string; color: string; icon: string; hint?: string };
type StoreSpec = {
  slug: string;
  name: string;
  templateId: string;
  stock: string;
  customerIdx: number;
  primary: string;
  /** [tên, danh mục, giá, giá KM?, thời lượng phút?] — có thời lượng = mặt hàng loại Dịch vụ (không tồn kho) */
  products: [string, string, number, (number | null)?, number?][];
  services: string[];
  /** Nhân sự: [tên, chức danh, lương cơ bản, dịch vụ đảm nhận, hoa hồng %?, trạng thái?] */
  team: [string, string, number, string[], number?, ("active" | "leave" | "quit")?][];
  /** Loại album riêng của shop (null = mặc định Hôm nay / Ảnh cưới / Đám hỏi / Khác) */
  albumKinds?: AlbumKind[];
  albumTitle?: (customerName: string, i: number) => string;
  /** Bán hàng tại quầy: khu vực → nhóm bàn [tiền tố, số lượng, loại, số ghế, giá giờ, block phút, tối thiểu phút] */
  pos?: { area: string; tables: [string, number, string, number, number, number, number][] }[];
  events?: { title: string; type: string; start: number; end: number; status: string; participants: number; description?: string }[];
};

async function seedStore(spec: StoreSpec, owner: { id: string }, subscriptionId: string | undefined) {
  const store = await prisma.store.create({
    data: {
      slug: spec.slug,
      name: spec.name,
      subtitle: "Dữ liệu mẫu",
      templateId: spec.templateId,
      customerId: owner.id,
      subscriptionId,
      phone: phone(),
      address: "12 Lê Lợi, Q.1, TP.HCM",
      theme: { primary: spec.primary },
      sliders: [],
      albumKinds: spec.albumKinds ?? undefined,
    },
  });
  const sid = store.id;

  await prisma.storeProduct.createMany({
    data: spec.products.map(([name, category, price, sale, duration], i) => ({
      storeId: sid,
      kind: duration ? "service" : "product",
      durationMin: duration ?? null,
      sku: `${spec.slug.slice(5, 8).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
      name,
      category,
      price,
      salePrice: sale ?? null,
      stock: duration ? 0 : i % 5 === 3 ? int(0, 6) : int(15, 120),
      costPrice: Math.round(((sale ?? price) * (duration ? 0.25 : 0.38 + rnd() * 0.12)) / 500) * 500,
      imageUrl: `/stock/${spec.stock}/prod-${(i % 6) + 1}.jpg`,
      active: i !== spec.products.length - 1,
      sortOrder: i,
      tag: i === 0 ? "Bán chạy" : i === 2 ? "Mới" : null,
    })),
  });
  const products = await prisma.storeProduct.findMany({ where: { storeId: sid }, orderBy: { sortOrder: "asc" } });

  await prisma.storeMemberTier.createMany({
    data: [
      { storeId: sid, code: "member", name: "Thành viên", minSpent: 0, discountPercent: 0, pointMultiplier: 1, color: "#64748b", sortOrder: 0 },
      { storeId: sid, code: "silver", name: "Bạc", minSpent: 2_000_000, minPoints: 200, discountPercent: 3, pointMultiplier: 1.2, color: "#94a3b8", sortOrder: 1 },
      { storeId: sid, code: "gold", name: "Vàng", minSpent: 5_000_000, minPoints: 500, discountPercent: 5, pointMultiplier: 1.5, color: "#f59e0b", sortOrder: 2 },
      { storeId: sid, code: "diamond", name: "Kim Cương", minSpent: 15_000_000, minPoints: 1500, discountPercent: 10, pointMultiplier: 2, color: "#8b5cf6", sortOrder: 3 },
    ],
  });
  await prisma.storeVoucher.createMany({
    data: [
      { storeId: sid, code: "CHAOBAN", title: "Giảm 15% đơn đầu tiên", discountType: "percent", discountValue: 15, maxDiscount: 50_000, minOrderValue: 100_000, quantity: 200, usedCount: 37, startDate: daysFromNow(-20), endDate: daysFromNow(40) },
      { storeId: sid, code: "VANG30K", title: "Giảm 30k cho hạng Vàng", discountType: "amount", discountValue: 30_000, minOrderValue: 200_000, tierCode: "gold", quantity: 100, usedCount: 8, startDate: daysFromNow(-5), endDate: daysFromNow(25) },
      { storeId: sid, code: "TET2026", title: "Ưu đãi Tết (hết hạn)", discountType: "percent", discountValue: 20, quantity: 50, usedCount: 50, startDate: daysFromNow(-90), endDate: daysFromNow(-30), active: false },
    ],
  });

  // Khách: chi tiêu / điểm / hạng khác nhau
  const customers = [];
  for (let i = 0; i < 18; i++) {
    const spent = [0, 350_000, 1_200_000, 2_600_000, 5_800_000, 16_500_000][i % 6] + int(0, 300_000);
    const tier = spent >= 15_000_000 ? "Kim Cương" : spent >= 5_000_000 ? "Vàng" : spent >= 2_000_000 ? "Bạc" : "Thành viên";
    customers.push(
      await prisma.storeCustomer.create({
        data: {
          storeId: sid,
          name: fullName(),
          phone: phone(),
          zaloUserId: i % 3 === 0 ? null : `demo-${spec.slug}-${i}`,
          lastLoginAt: i % 3 === 0 ? null : daysFromNow(-int(0, 14), int(8, 21)),
          tier,
          totalSpent: spent,
          totalOrders: spent ? int(1, 12) : 0,
          points: Math.floor(spent / 1000),
          address: rnd() > 0.5 ? pick(["Q.1, TP.HCM", "Q.3, TP.HCM", "Thủ Đức, TP.HCM", "Cầu Giấy, Hà Nội"]) : null,
          createdAt: daysFromNow(-int(5, 120)),
        },
      }),
    );
  }

  // Đơn hàng
  const STATUSES = ["pending", "pending", "confirmed", "shipping", "completed", "completed", "completed", "cancelled"] as const;
  for (let i = 0; i < 26; i++) {
    const c = pick(customers);
    const lines = Array.from({ length: int(1, 3) }, () => {
      const p = pick(products);
      const qty = int(1, 3);
      const unit = p.salePrice ?? p.price;
      return { productId: p.id, productName: p.name, imageUrl: p.imageUrl, unitPrice: unit, quantity: qty, lineTotal: unit * qty };
    });
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const ship = rnd() > 0.5 ? 15_000 : 0;
    const discount = i % 7 === 0 ? Math.min(50_000, Math.round(subtotal * 0.15)) : 0;
    await prisma.storeOrder.create({
      data: {
        storeId: sid,
        customerId: c.id,
        code: `DM${spec.slug.slice(5, 7).toUpperCase()}${String(1000 + i)}`,
        customerName: c.name,
        phone: c.phone,
        address: c.address,
        subtotal,
        shippingFee: ship,
        discountAmount: discount,
        voucherCode: discount ? "CHAOBAN" : null,
        totalAmount: subtotal + ship - discount,
        source: pick(["miniapp", "miniapp", "pos", "admin"]),
        status: STATUSES[i % STATUSES.length],
        paymentMethod: pick(["cod", "bank_transfer", "ewallet", "cash"]),
        createdAt: daysFromNow(-int(0, 20), int(8, 21), int(0, 59)),
        items: { create: lines },
      },
    });
  }

  // Lịch hẹn: hôm qua → +5 ngày, nhiều nhân viên
  // Nhân sự
  await prisma.storeStaff.createMany({
    data: spec.team.map(([name, position, baseSalary, services, commissionPercent, status], i) => ({
      storeId: sid,
      code: `NV${String(i + 1).padStart(3, "0")}`,
      attendanceCode: String(101 + i),
      name,
      phone: phone(),
      position,
      department: /BS|KTV|Kỹ thuật|Barista|Điều dưỡng/i.test(name + position) ? "Chuyên môn" : "Vận hành",
      status: status ?? "active",
      employmentType: i === spec.team.length - 1 ? "part_time" : i === spec.team.length - 2 ? "probation" : "full_time",
      startDate: daysFromNow(-int(60, 900), 0),
      baseSalary,
      commissionPercent: commissionPercent ?? null,
      workDays: i % 2 ? [0, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6],
      shiftStart: i % 3 === 2 ? "13:00" : "08:00",
      shiftEnd: i % 3 === 2 ? "21:30" : "17:30",
      services,
      sortOrder: i,
    })),
  });
  // Bán hàng: khu vực, bàn / phòng, phiên đang mở + phiên đã thanh toán (đơn nguồn "pos")
  if (spec.pos) {
    const goods = products.filter((p) => p.kind === "product" && p.active);
    let order = 0;
    let posSeq = 0;
    for (const [ai, a] of spec.pos.entries()) {
      const area = await prisma.storeArea.create({ data: { storeId: sid, name: a.area, sortOrder: ai } });
      for (const [prefix, count, kind, seats, pricePerHour, blockMinutes, minMinutes] of a.tables) {
        for (let n = 1; n <= count; n++) {
          const t = await prisma.storeTable.create({
            data: { storeId: sid, areaId: area.id, name: `${prefix}${n}`, kind, seats, pricePerHour, blockMinutes, minMinutes, sortOrder: order++, state: rnd() < 0.08 ? "reserved" : rnd() < 0.05 ? "cleaning" : "ready", stateNote: null },
          });
          if (t.state === "reserved") await prisma.storeTable.update({ where: { id: t.id }, data: { stateNote: `${pick(TEN)} · ${pick(["18:30", "19:00", "20:00"])}` } });
          const lineOf = () => {
            const p = pick(goods);
            return { productId: p.id, name: p.name, unitPrice: p.salePrice ?? p.price, quantity: int(1, 3) };
          };
          // Lịch sử 14 ngày: 0–3 phiên / bàn / ngày
          for (let d = -13; d <= 0; d++) {
            for (let k = 0; k < int(0, pricePerHour ? 3 : 2); k++) {
              const start = daysFromNow(d, int(9, 21), int(0, 59));
              const minutes = pricePerHour ? int(35, 200) : int(20, 120);
              const end = new Date(start.getTime() + minutes * 60_000);
              if (end > new Date()) continue;
              const items = Array.from({ length: int(pricePerHour ? 0 : 1, 4) }, lineOf);
              const block = Math.max(1, blockMinutes);
              const billed = pricePerHour ? Math.max(minMinutes, Math.ceil(minutes / block) * block) : 0;
              const timeCharge = Math.round((billed * pricePerHour) / 60 / 1000) * 1000;
              const itemsTotal = items.reduce((x, i) => x + i.unitPrice * i.quantity, 0);
              if (!itemsTotal && !timeCharge) continue;
              const payment = pick(["cash", "cash", "bank_transfer", "ewallet", "card"]);
              const lines = [
                ...(timeCharge ? [{ productId: null, productName: `Giờ ${t.name} (${billed >= 60 ? `${Math.floor(billed / 60)}h${billed % 60 ? String(billed % 60).padStart(2, "0") : ""}` : `${billed} phút`})`, unitPrice: timeCharge, quantity: 1, lineTotal: timeCharge }] : []),
                ...items.map((i) => ({ productId: i.productId, productName: i.name, unitPrice: i.unitPrice, quantity: i.quantity, lineTotal: i.unitPrice * i.quantity })),
              ];
              const o = await prisma.storeOrder.create({
                data: {
                  storeId: sid,
                  code: `DMP${spec.slug.slice(5, 7).toUpperCase()}${String(10000 + posSeq++)}`,
                  customerName: `Khách lẻ · ${t.name}`,
                  phone: "",
                  subtotal: itemsTotal + timeCharge,
                  totalAmount: itemsTotal + timeCharge,
                  source: "pos",
                  status: "completed",
                  paymentMethod: payment,
                  createdAt: end,
                  items: { create: lines },
                },
              });
              await prisma.storeTableSession.create({
                data: { storeId: sid, tableId: t.id, status: "closed", startedAt: start, endedAt: end, guestCount: int(1, seats || 4), items, pricePerHour, blockMinutes, minMinutes, timeCharge, itemsTotal, total: itemsTotal + timeCharge, paymentMethod: payment, orderId: o.id, createdAt: start },
              });
            }
          }
          // Đang có khách (~40% bàn)
          if (t.state === "ready" && rnd() < 0.4) {
            await prisma.storeTableSession.create({
              data: {
                storeId: sid,
                tableId: t.id,
                startedAt: new Date(Date.now() - int(8, 150) * 60_000),
                guestCount: int(1, seats || 4),
                items: Array.from({ length: int(0, 3) }, lineOf),
                pricePerHour,
                blockMinutes,
                minMinutes,
              },
            });
          }
        }
      }
    }
  }

  // Chấm công 14 ngày gần nhất (giờ VN): đúng giờ / muộn / thỉnh thoảng vắng; người "nghỉ phép" nghỉ từ hôm qua
  const members = await prisma.storeStaff.findMany({ where: { storeId: sid }, orderBy: { sortOrder: "asc" } });
  const VN = 7 * 3_600_000;
  const vnDay = (offset: number) => new Date(Date.now() + VN + offset * DAY).toISOString().slice(0, 10);
  const at = (date: string, hhmm: string, plusMin: number) => {
    const [h, m] = hhmm.split(":").map(Number);
    return new Date(new Date(`${date}T00:00:00Z`).getTime() - VN + (h * 60 + m + plusMin) * 60_000);
  };
  const att: Prisma.StoreAttendanceCreateManyInput[] = [];
  for (const m of members) {
    const days = (m.workDays as number[] | null) ?? [];
    for (let d = -13; d <= 0; d++) {
      const date = vnDay(d);
      const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
      if (!days.includes(wd)) continue;
      if (m.status === "leave" && d >= -1) {
        att.push({ storeId: sid, staffId: m.id, workDate: date, status: "leave", note: "Nghỉ phép năm", source: "manual" });
        continue;
      }
      const r = rnd();
      if (r < 0.05) {
        att.push({ storeId: sid, staffId: m.id, workDate: date, status: "absent", source: "manual" });
        continue;
      }
      const start = m.shiftStart ?? "08:00";
      const end = m.shiftEnd ?? "17:30";
      const late = r > 0.82 ? int(8, 35) : 0;
      const inAt = at(date, start, late ? late : -int(0, 12));
      // Hôm nay: chưa ai chấm ra; vài người chưa tới
      if (d === 0 && rnd() < 0.25) continue;
      const outAt = d === 0 ? null : at(date, end, int(-5, 25));
      const lateMinutes = late > 5 ? late : 0;
      att.push({
        storeId: sid,
        staffId: m.id,
        workDate: date,
        checkInAt: inAt,
        checkOutAt: outAt,
        status: lateMinutes ? "late" : "present",
        lateMinutes,
        workedMinutes: outAt ? Math.round((outAt.getTime() - inAt.getTime()) / 60_000) : 0,
        source: rnd() > 0.5 ? "web" : "manual",
      });
    }
  }
  await prisma.storeAttendance.createMany({ data: att });

  const STAFF = spec.team.filter((t) => (t[5] ?? "active") === "active" && t[3].length).map((t) => t[0]);
  const SLOT = ["09:00", "10:30", "13:00", "14:30", "16:00", "18:30"];
  const BST = ["pending", "confirmed", "confirmed", "completed", "cancelled"] as const;
  for (let i = 0; i < 22; i++) {
    const c = pick(customers);
    const d = int(-1, 5);
    await prisma.storeBooking.create({
      data: {
        storeId: sid,
        customerId: c.id,
        code: `DMBK${spec.slug.slice(5, 7).toUpperCase()}${String(100 + i)}`,
        customerName: c.name,
        phone: c.phone,
        serviceName: pick(spec.services),
        bookingDate: daysFromNow(d, 0),
        timeSlot: pick(SLOT),
        staffName: rnd() > 0.15 ? pick(STAFF) : null,
        status: d < 0 ? pick(["completed", "cancelled"] as const) : BST[i % BST.length],
        note: rnd() > 0.7 ? "Khách quen, ưu tiên phòng riêng" : null,
      },
    });
  }

  await prisma.storeEvent.createMany({
    data: spec.events
      ? spec.events.map((e) => ({ storeId: sid, title: e.title, type: e.type, startDate: daysFromNow(e.start), endDate: daysFromNow(e.end), status: e.status, participants: e.participants, description: e.description }))
      : [
      { storeId: sid, title: "Tuần lễ tri ân khách hàng", type: "promotion", startDate: daysFromNow(-3), endDate: daysFromNow(4), status: "running", participants: 128, description: "Giảm 20% toàn bộ menu" },
      { storeId: sid, title: "Workshop pha chế cuối tuần", type: "workshop", startDate: daysFromNow(6), endDate: daysFromNow(6), status: "upcoming", participants: 24 },
      { storeId: sid, title: "Khai trương chi nhánh 2", type: "promotion", startDate: daysFromNow(-40), endDate: daysFromNow(-33), status: "ended", participants: 410 },
        ],
  });
  await prisma.storeDocument.createMany({
    data: [
      { storeId: sid, slug: "chinh-sach-doi-tra", title: "Chính sách đổi trả", category: "return", content: "Đổi trả trong 7 ngày nếu sản phẩm lỗi do nhà sản xuất." },
      { storeId: sid, slug: "dieu-khoan", title: "Điều khoản sử dụng", category: "terms", content: "Khi sử dụng Mini App, bạn đồng ý với các điều khoản sau…" },
      { storeId: sid, slug: "huong-dan-tich-diem", title: "Hướng dẫn tích điểm", category: "guide", content: "1.000đ = 1 điểm, nhân hệ số theo hạng thành viên.", published: false },
    ],
  });

  // Album (chỉ link ảnh gốc, không có file) + tin nhắn shop ↔ khách
  const albumKinds = (spec.albumKinds ?? [{ key: "today" }, { key: "wedding" }, { key: "engagement" }, { key: "other" }]).map((k) => k.key);
  const albumCount = spec.albumKinds ? 8 : 4;
  for (let i = 0; i < albumCount; i++) {
    const c = customers[(i + 1) % customers.length];
    const published = i < albumCount - 1;
    const a = await prisma.storeAlbum.create({
      data: {
        storeId: sid,
        customerId: c.id,
        title: spec.albumTitle ? spec.albumTitle(c.name, i) : `${pick(["Album", "Bộ ảnh", "Ảnh"])} ${c.name.split(" ").pop()} ${i + 1}`,
        kind: albumKinds[i % albumKinds.length],
        eventDate: daysFromNow(-int(1, 30), 0),
        links: [{ label: "Google Drive", url: "https://drive.google.com/drive/folders/demo" }],
        status: published ? "published" : "draft",
        publishedAt: published ? daysFromNow(-i) : null,
        viewedAt: i === 0 ? daysFromNow(0) : null,
      },
    });
    if (published) {
      await prisma.storeMessage.create({ data: { storeId: sid, customerId: c.id, direction: "out", body: `${a.title} của bạn đã sẵn sàng 🎉`, albumId: a.id, createdAt: daysFromNow(-i) } });
    }
  }
  for (let i = 0; i < 6; i++) {
    const c = customers[i];
    await prisma.storeMessage.createMany({
      data: [
        { storeId: sid, customerId: c.id, direction: "in", body: pick(["Cho mình đặt lịch chiều mai nhé", "Quán còn mở cửa không ạ?", "Mình muốn đổi giờ hẹn", "Voucher CHAOBAN dùng thế nào vậy?"]), createdAt: daysFromNow(-i, 10), readAt: i > 2 ? daysFromNow(-i, 11) : null },
        ...(i > 2 ? [{ storeId: sid, customerId: c.id, direction: "out", body: "Dạ được ạ, shop đã ghi nhận cho mình.", createdAt: daysFromNow(-i, 11), readAt: daysFromNow(-i, 12) }] : []),
      ],
    });
  }

  return { id: sid, slug: spec.slug, products: products.length, customers: customers.length };
}

async function main() {
  await clean();
  if (hasFlag("--clean")) return;

  const { customers, subs } = await seedPlatform();
  const stores: StoreSpec[] = [
    {
      slug: "demo-mochuong",
      name: "Cà phê Mộc Hương",
      templateId: "fnb_cafe_01",
      stock: "fnb",
      customerIdx: 0,
      primary: "#6f4e37",
      products: [
        ["Cà phê sữa đá", "Cà phê", 35_000, 29_000],
        ["Bạc xỉu", "Cà phê", 39_000],
        ["Cold brew cam sả", "Cà phê", 55_000],
        ["Trà đào cam sả", "Trà", 45_000, 39_000],
        ["Trà sen vàng", "Trà", 49_000],
        ["Bánh croissant bơ", "Bánh", 32_000],
        ["Bánh tiramisu", "Bánh", 45_000],
        ["Sữa chua phúc bồn tử", "Đá xay", 52_000],
        ["Cà phê muối", "Cà phê", 42_000],
        ["Matcha latte", "Trà", 55_000],
        ["Combo sáng (cà phê + bánh)", "Combo", 59_000, 49_000],
        ["Nước ép cam (ngừng bán)", "Nước ép", 40_000],
      ],
      services: ["Đặt bàn 2 người", "Đặt bàn nhóm", "Tiệc sinh nhật", "Workshop pha chế"],
      pos: [
        { area: "Tầng 1", tables: [["B", 8, "table", 4, 0, 30, 0]] },
        { area: "Tầng 2", tables: [["L", 6, "table", 4, 0, 30, 0], ["Phòng họp ", 1, "room", 10, 120_000, 30, 60]] },
        { area: "Sân vườn", tables: [["S", 4, "table", 6, 0, 30, 0]] },
      ],
      team: [
        ["Phạm Quốc Huy", "Quản lý cửa hàng", 12_000_000, ["Tiệc sinh nhật", "Đặt bàn nhóm"], 1],
        ["Ngọc Anh", "Barista", 7_500_000, ["Workshop pha chế"], 2],
        ["Minh Tuấn", "Barista", 7_000_000, ["Workshop pha chế", "Đặt bàn 2 người"]],
        ["Thu Hà", "Thu ngân", 6_500_000, ["Đặt bàn 2 người", "Đặt bàn nhóm"]],
        ["Gia Bảo", "Phục vụ", 5_500_000, [], undefined, "leave"],
        ["Lan Chi", "Phục vụ", 3_200_000, []],
      ],
    },
    {
      slug: "demo-lotusspa",
      name: "Lotus Spa Quận 3",
      templateId: "spa_01",
      stock: "spa",
      customerIdx: 1,
      primary: "#be185d",
      products: [
        ["Chăm sóc da cơ bản 60'", "Chăm sóc da", 350_000, null, 60],
        ["Massage body đá nóng 90'", "Massage", 550_000, 480_000, 90],
        ["Gội đầu dưỡng sinh", "Gội đầu", 150_000, null, 45],
        ["Liệu trình trị mụn 10 buổi", "Liệu trình", 3_500_000, 2_990_000, 75],
        ["Serum vitamin C 30ml", "Mỹ phẩm", 450_000, 390_000],
        ["Tắm trắng thảo dược", "Body", 650_000, null, 90],
        ["Massage chân 45'", "Massage", 220_000, null, 45],
        ["Kem chống nắng SPF50", "Mỹ phẩm", 320_000],
        ["Nặn mụn chuẩn y khoa", "Chăm sóc da", 280_000, null, 60],
        ["Mặt nạ collagen (hộp 5 miếng)", "Mỹ phẩm", 250_000],
        ["Combo thư giãn cuối tuần", "Combo", 890_000, null, 150],
      ],
      services: ["Chăm sóc da cơ bản 60'", "Massage body đá nóng 90'", "Gội đầu dưỡng sinh", "Liệu trình trị mụn 10 buổi", "Massage chân 45'"],
      team: [
        ["Võ Thanh Tâm", "Quản lý spa", 13_000_000, [], 1],
        ["Mai Linh", "Kỹ thuật viên da", 8_000_000, ["Chăm sóc da cơ bản 60'", "Liệu trình trị mụn 10 buổi", "Nặn mụn chuẩn y khoa"], 10],
        ["Hồng Nhung", "Kỹ thuật viên massage", 7_500_000, ["Massage body đá nóng 90'", "Massage chân 45'", "Gội đầu dưỡng sinh"], 10],
        ["Thảo Vy", "Kỹ thuật viên", 7_000_000, ["Gội đầu dưỡng sinh", "Massage chân 45'", "Chăm sóc da cơ bản 60'"], 8],
        ["Kim Ngân", "Lễ tân", 6_000_000, []],
        ["Bích Trâm", "Kỹ thuật viên", 4_000_000, ["Gội đầu dưỡng sinh"], 8],
      ],
    },
    {
      slug: "demo-babysee",
      name: "Siêu âm BabySee 5D",
      templateId: "sieu_am_5d_01",
      stock: "mombaby",
      customerIdx: 8,
      primary: "#0ea5e9",
      products: [
        ["Siêu âm 5D (tuần 20–32)", "Siêu âm", 450_000, 390_000, 30],
        ["Siêu âm hình thái học", "Siêu âm", 550_000, null, 40],
        ["Siêu âm tim thai", "Siêu âm", 400_000, null, 30],
        ["Đo độ mờ da gáy (tuần 11–14)", "Sàng lọc", 350_000, null, 20],
        ["Xét nghiệm NIPT cơ bản", "Xét nghiệm", 3_900_000, 3_500_000, 15],
        ["Khám thai định kỳ", "Khám thai", 200_000, null, 20],
        ["Gói theo dõi thai kỳ 8 mốc", "Gói khám", 6_900_000, 5_990_000, 30],
        ["In ảnh 5D khổ A4 + USB video", "Bán kèm", 150_000],
        ["Sữa bầu (hộp 800g)", "Bán kèm", 420_000, 395_000],
        ["Siêu âm Doppler mạch máu", "Siêu âm", 380_000, null, 30],
        ["Tư vấn dinh dưỡng thai kỳ", "Tư vấn", 250_000, null, 30],
        ["Đo loãng xương (tạm ngừng)", "Xét nghiệm", 180_000, null, 15],
      ],
      services: ["Siêu âm 5D", "Siêu âm hình thái học", "Siêu âm tim thai", "Đo độ mờ da gáy", "Khám thai định kỳ", "Xét nghiệm NIPT"],
      team: [
        ["BS. Trần Minh Khoa", "Bác sĩ siêu âm", 28_000_000, ["Siêu âm 5D", "Siêu âm hình thái học", "Siêu âm tim thai", "Đo độ mờ da gáy"], 5],
        ["BS. Lê Thu Hằng", "Bác sĩ sản khoa", 26_000_000, ["Khám thai định kỳ", "Xét nghiệm NIPT", "Siêu âm hình thái học"], 5],
        ["KTV. Ngọc Bích", "Kỹ thuật viên", 9_000_000, ["Siêu âm 5D", "Đo độ mờ da gáy"], 3],
        ["Hoàng Yến", "Điều dưỡng", 8_500_000, ["Xét nghiệm NIPT", "Khám thai định kỳ"]],
        ["Phương Thảo", "Lễ tân – Thu ngân", 7_000_000, []],
        ["BS. Đỗ Quang Vinh", "Bác sĩ siêu âm", 15_000_000, ["Siêu âm 5D", "Siêu âm tim thai"], 5, "leave"],
      ],
      albumKinds: [
        { key: "sieu_am_5d", label: "Siêu âm 5D", color: "#0ea5e9", icon: "baby", hint: "Ảnh + video 5D gửi mẹ bầu" },
        { key: "hinh_thai", label: "Hình thái học", color: "#8b5cf6", icon: "sparkles", hint: "Ảnh siêu âm hình thái tuần 20–24" },
        { key: "tim_thai", label: "Tim thai", color: "#e11d48", icon: "heart", hint: "Ảnh / video tim thai" },
        { key: "other", label: "Khác", color: "#64748b", icon: "images", hint: "Kết quả khác" },
      ],
      albumTitle: (name, i) => `${["Siêu âm 5D", "Hình thái học", "Tim thai", "Kết quả xét nghiệm"][i % 4]} – bé nhà ${name.split(" ").pop()} (tuần ${20 + (i * 3) % 14})`,
      events: [
        { title: "Tháng tri ân mẹ bầu – giảm 15% siêu âm 5D", type: "promotion", start: -5, end: 25, status: "running", participants: 86, description: "Áp dụng cho khách đặt lịch qua Mini App" },
        { title: "Lớp tiền sản cuối tuần", type: "workshop", start: 4, end: 4, status: "upcoming", participants: 30, description: "Chuẩn bị đi sinh, chăm sóc bé sơ sinh" },
        { title: "Khám sàng lọc miễn phí", type: "promotion", start: -45, end: -40, status: "ended", participants: 152 },
      ],
    },
    {
      slug: "demo-saobida",
      name: "Sao Billiards & Karaoke",
      templateId: "fnb_cafe_01",
      stock: "fnb",
      customerIdx: 9,
      primary: "#16a34a",
      products: [
        ["Bia Tiger (lon)", "Bia", 25_000],
        ["Bia Heineken (lon)", "Bia", 30_000],
        ["Nước suối", "Nước", 10_000],
        ["Sting", "Nước", 15_000],
        ["Trà đá", "Nước", 5_000],
        ["Cà phê sữa", "Nước", 25_000],
        ["Khô bò", "Đồ nhắm", 60_000],
        ["Trái cây dĩa", "Đồ nhắm", 120_000, 99_000],
        ["Mì xào bò", "Đồ ăn", 55_000],
        ["Đậu phộng rang", "Đồ nhắm", 20_000],
        ["Thuê cơ riêng", "Dịch vụ", 20_000, null, 60],
        ["Gói sinh nhật phòng VIP", "Dịch vụ", 500_000, null, 180],
      ],
      services: ["Đặt bàn bida", "Đặt phòng karaoke", "Gói sinh nhật phòng VIP"],
      pos: [
        { area: "Khu bida lỗ", tables: [["Bida lỗ ", 6, "billiards", 4, 60_000, 30, 30]] },
        { area: "Khu bida phăng", tables: [["Phăng ", 4, "billiards", 2, 50_000, 15, 0]] },
        { area: "Karaoke", tables: [["P.", 4, "karaoke", 8, 150_000, 30, 60], ["VIP ", 2, "karaoke", 15, 300_000, 30, 60]] },
        { area: "Quầy bar", tables: [["Bar ", 4, "table", 2, 0, 30, 0]] },
      ],
      team: [
        ["Lý Văn Tài", "Quản lý ca", 10_000_000, ["Đặt bàn bida", "Đặt phòng karaoke"], 1],
        ["Minh Khôi", "Thu ngân", 6_500_000, []],
        ["Quang Huy", "Phục vụ", 5_500_000, ["Đặt bàn bida"]],
        ["Thùy Dung", "Phục vụ", 5_500_000, ["Đặt phòng karaoke", "Gói sinh nhật phòng VIP"]],
        ["Hải Nam", "Phục vụ", 3_500_000, []],
      ],
    },
  ];
  const results = [];
  for (const s of stores) {
    const r = await seedStore(s, customers[s.customerIdx], subs[s.customerIdx]?.id);
    // gắn dự án của khách vào gian hàng vừa tạo
    await prisma.project.updateMany({ where: { customerId: customers[s.customerIdx].id }, data: { storeId: r.id } });
    results.push(r);
  }
  // Quán cà phê: nguyên liệu + định mức (BOM) + size / topping + phiếu nhập kho
  const cafeStore = results.find((x) => x.slug === "demo-mochuong");
  if (cafeStore) {
    const sid = cafeStore.id;
    const MATS: [string, string, number, number][] = [
      ["Cà phê hạt rang xay", "g", 320, 4200],
      ["Sữa đặc", "ml", 45, 6000],
      ["Sữa tươi", "ml", 32, 9000],
      ["Đường nước", "ml", 18, 3000],
      ["Trà đen", "g", 260, 1500],
      ["Đào ngâm", "miếng", 2500, 180],
      ["Trân châu đen", "g", 60, 2500],
      ["Ly nhựa 500ml + nắp", "cái", 1200, 600],
      ["Bột matcha", "g", 900, 400],
    ];
    const mat: Record<string, string> = {};
    for (const [i, [name, unit, costPrice, stock]] of MATS.entries()) {
      const m = await prisma.storeProduct.create({
        data: { storeId: sid, kind: "material", name, unit, category: "Nguyên liệu", price: 0, costPrice, stock, active: false, sortOrder: 100 + i, sku: `NL-${String(i + 1).padStart(3, "0")}` },
      });
      mat[name] = m.id;
    }
    const prods = await prisma.storeProduct.findMany({ where: { storeId: sid, kind: "product" } });
    const byName = (n: string) => prods.find((x) => x.name === n);
    const BOM: Record<string, [string, number][]> = {
      "Cà phê sữa đá": [["Cà phê hạt rang xay", 20], ["Sữa đặc", 30], ["Ly nhựa 500ml + nắp", 1]],
      "Bạc xỉu": [["Cà phê hạt rang xay", 10], ["Sữa đặc", 25], ["Sữa tươi", 80], ["Ly nhựa 500ml + nắp", 1]],
      "Cà phê muối": [["Cà phê hạt rang xay", 20], ["Sữa tươi", 60], ["Đường nước", 15], ["Ly nhựa 500ml + nắp", 1]],
      "Trà đào cam sả": [["Trà đen", 8], ["Đào ngâm", 3], ["Đường nước", 25], ["Ly nhựa 500ml + nắp", 1]],
      "Matcha latte": [["Bột matcha", 6], ["Sữa tươi", 150], ["Đường nước", 15], ["Ly nhựa 500ml + nắp", 1]],
    };
    const SIZE = { id: "size", name: "Size", multiple: false, required: true, max: null, choices: [{ id: "m", name: "M", price: 0 }, { id: "l", name: "L", price: 6000, bom: [{ productId: mat["Sữa tươi"], quantity: 40 }] }] };
    const TOPPING = {
      id: "topping",
      name: "Topping",
      multiple: true,
      required: false,
      max: 3,
      choices: [
        { id: "tc", name: "Trân châu đen", price: 5000, bom: [{ productId: mat["Trân châu đen"], quantity: 40 }] },
        { id: "shot", name: "Thêm shot cà phê", price: 8000, bom: [{ productId: mat["Cà phê hạt rang xay"], quantity: 10 }] },
        { id: "kem", name: "Kem cheese", price: 10000 },
      ],
    };
    const SUGAR = { id: "duong", name: "Đường", multiple: false, required: false, max: null, choices: [{ id: "it", name: "Ít đường", price: 0 }, { id: "nhieu", name: "Nhiều đường", price: 0 }] };
    for (const [name, lines] of Object.entries(BOM)) {
      const p = byName(name);
      if (!p) continue;
      await prisma.storeProduct.update({
        where: { id: p.id },
        data: { bom: lines.map(([m, q]) => ({ productId: mat[m], quantity: q })), options: [SIZE, TOPPING, SUGAR], stock: 0 },
      });
    }
    // 3 phiếu nhập kho gần đây
    const SUP = ["Đại lý cà phê Cầu Đất", "Siêu thị Mega Market", "Bao bì Minh Phát"];
    for (let k = 0; k < 3; k++) {
      const picks = Object.values(mat).filter((_, i) => i % 3 === k);
      const items = picks.map((id) => {
        const m = MATS.find(([n]) => mat[n] === id)!;
        return { productId: id, name: m[0], quantity: Math.round(m[3] / 3), unitCost: m[2] };
      });
      await prisma.storeStockReceipt.create({
        data: { storeId: sid, code: `PN${String(k + 1).padStart(5, "0")}`, supplier: SUP[k], receivedAt: daysFromNow(-10 + k * 4, 9), items, total: items.reduce((x, i) => x + i.quantity * i.unitCost, 0) },
      });
    }
  }

  // Thẻ tích tem cho quán cà phê: 8 tem (mỗi ly cà phê / trà 1 tem) đổi 1 ly bất kỳ
  const cafe = results.find((x) => x.slug === "demo-mochuong");
  if (cafe) {
    const drinks = await prisma.storeProduct.findMany({ where: { storeId: cafe.id, category: { in: ["Cà phê", "Trà"] } }, select: { id: true } });
    await prisma.store.update({
      where: { id: cafe.id },
      data: { stampProgram: { enabled: true, required: 8, productIds: drinks.map((d) => d.id), countBy: "item", reward: "Tặng 1 ly bất kỳ", icon: "coffee" } },
    });
    const cs = await prisma.storeCustomer.findMany({ where: { storeId: cafe.id }, select: { id: true } });
    for (const c of cs) await prisma.storeCustomer.update({ where: { id: c.id }, data: { stamps: int(0, 9), stampRewards: int(0, 3) } });
  }

  console.log("Đã tạo dữ liệu mẫu:", { khachNenTang: customers.length, goiDangKy: subs.filter(Boolean).length, gianHang: results });
  console.log("Xoá: npm run seed:demo -- --clean");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
