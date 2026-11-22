import { App as AntApp, Button, Collapse, Drawer, Form, Input, Select, Steps, Tag } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowRight,
  LuCheck,
  LuClock,
  LuLayers,
  LuMail,
  LuMapPin,
  LuMenu,
  LuPhoneCall,
  LuQrCode,
  LuSearch,
  LuShieldCheck,
  LuSmartphone,
  LuSparkles,
  LuStore,
  LuZap,
} from "react-icons/lu";
import { templateThumbnails } from "../assets/thumbs";
import PreviewModal from "../components/PreviewModal";
import {
  categories,
  CategoryId,
  DemoTemplate,
  demoTemplates,
  faqs,
  getCategoryLabel,
  getZaloTemplateUrl,
  pricingPlans,
  siteConfig,
} from "../data/site";

interface LeadFormValues {
  name: string;
  phone: string;
  industry?: string;
  templateId?: string;
  note?: string;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<LeadFormValues>();

  const [activeCat, setActiveCat] = useState<CategoryId>("all");
  const [keyword, setKeyword] = useState("");
  const [preview, setPreview] = useState<DemoTemplate | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const promoDeadline = dayjs().endOf("month").format("DD/MM/YYYY");

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return demoTemplates
      .filter((t) => activeCat === "all" || t.categories.includes(activeCat))
      .filter(
        (t) =>
          !kw ||
          `${t.code} ${t.name} ${t.brand} ${t.description}`.toLowerCase().includes(kw),
      );
  }, [activeCat, keyword]);

  const handleSelectForQuote = (tpl: DemoTemplate) => {
    setPreview(null);
    form.setFieldsValue({
      templateId: tpl.id,
      industry: getCategoryLabel(tpl.categories[0]),
      note: `Tôi muốn tư vấn triển khai theo mẫu [${tpl.code}] ${tpl.name}`,
    });
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (values: LeadFormValues) => {
    const cleanPhone = values.phone.replace(/\s+/g, "");
    setSubmitting(true);
    try {
      const res = await fetch(`${siteConfig.apiUrl}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          phone: cleanPhone,
          industry: values.industry || undefined,
          templateId: values.templateId || undefined,
          note: values.note?.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message?.[0] || errBody?.message || "Gửi yêu cầu thất bại");
      }
      message.success("Đã gửi yêu cầu tư vấn thành công! Đội ngũ recloud.vn sẽ liên hệ sớm nhất.");
      form.resetFields();
    } catch (err) {
      message.error(
        err instanceof Error
          ? `${err.message}. Hotline hỗ trợ: ${siteConfig.phoneDisplay}`
          : "Không thể kết nối máy chủ. Vui lòng gọi trực tiếp hotline.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const navLinks = [
    { href: "#solutions", label: "Giải pháp" },
    { href: "#demo-gallery", label: `Kho mẫu (${demoTemplates.length})` },
    { href: "#process", label: "Quy trình" },
    { href: "#pricing", label: "Bảng giá" },
    { href: "#contact", label: "Liên hệ" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="#" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-black text-white shadow-sm">
              re
            </span>
            <div className="leading-tight">
              <div className="text-base font-extrabold tracking-tight text-slate-900">
                {siteConfig.brand}
              </div>
              <div className="text-[11px] text-slate-500">{siteConfig.owner}</div>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-brand-600">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              icon={<LuStore size={15} className="text-brand-600" />}
              onClick={() => navigate("/admin/overview")}
              className="font-bold"
            >
              Quản lý Store
            </Button>
            <Button type="primary" href="#contact" className="hidden font-bold sm:inline-flex">
              Tư vấn ngay
            </Button>
            <Button
              type="text"
              icon={<LuMenu size={20} />}
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            />
          </div>
        </div>
      </header>

      <Drawer
        title={siteConfig.brand}
        placement="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        size={260}
      >
        <div className="flex flex-col gap-3">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {l.label}
            </a>
          ))}
        </div>
      </Drawer>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f4f7ff] via-white to-white py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-12">
          <div className="md:col-span-7">
            <Tag color="blue" className="rounded-full px-3 py-1 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5">
                <LuSparkles size={13} />
                Ưu đãi tháng {dayjs().format("MM/YYYY")} · Áp dụng đến {promoDeadline}
              </span>
            </Tag>

            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl md:leading-[1.15]">
              Thiết kế & Triển khai{" "}
              <span className="text-brand-600">Zalo Mini App</span> trọn gói cho doanh nghiệp
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              Tiếp cận hàng chục triệu khách hàng ngay trên Zalo mà không cần tải app. Đa dạng mẫu
              chuẩn ngành từ bán lẻ, F&B, phòng khám siêu âm 5D, công chứng, luật đến quản lý nhân
              sự khu công nghiệp.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                type="primary"
                size="large"
                href="#demo-gallery"
                icon={<LuArrowRight size={16} />}
                iconPlacement="end"
                className="h-12 px-6 font-bold shadow-lg shadow-brand-600/20"
              >
                Xem {demoTemplates.length} mẫu demo
              </Button>
              <Button
                size="large"
                href={getZaloTemplateUrl()}
                target="_blank"
                rel="noreferrer"
                icon={<LuQrCode size={16} className="text-brand-600" />}
                className="h-12 px-6 font-bold"
              >
                Mở kho mẫu trên Zalo
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-4">
              {[
                { val: `${demoTemplates.length}+`, label: "Mẫu chuẩn ngành" },
                { val: "5–14 ngày", label: "Thời gian bàn giao" },
                { val: "50+", label: "Doanh nghiệp tin dùng" },
                { val: "99.9%", label: "Hệ thống ổn định" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold text-brand-600">{s.val}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center gap-4 md:col-span-5">
            <div className="w-48 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-xl">
              <img
                src={templateThumbnails["thoi_trang_01"]}
                alt="Mẫu thời trang"
                className="w-full rounded-2xl"
              />
            </div>
            <div className="mt-10 w-48 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-xl">
              <img
                src={templateThumbnails["kcn_doanh_nghiep_01"]}
                alt="Mẫu doanh nghiệp KCN"
                className="w-full rounded-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Lợi thế giải pháp */}
      <section id="solutions" className="border-y border-slate-100 bg-slate-50/60 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-brand-600">
              Tại sao chọn Zalo Mini App?
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 md:text-3xl">
              Giải pháp chuyển đổi số tinh gọn, chi phí tối ưu
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: LuSmartphone,
                title: "Không cần cài đặt App",
                text: "Khách hàng mở thẳng từ link, mã QR hoặc Zalo OA chỉ trong 1 giây.",
              },
              {
                icon: LuZap,
                title: "Triển khai thần tốc",
                text: "Có sẵn 19 mẫu khung chuẩn ngành, tuỳ biến thương hiệu xong trong 5–14 ngày.",
              },
              {
                icon: LuLayers,
                title: "Backend PostgreSQL riêng",
                text: "Đầy đủ API NestJS, trang quản trị đơn hàng, lịch hẹn, check công & tài liệu.",
              },
              {
                icon: LuShieldCheck,
                title: "Tích hợp hệ sinh thái Zalo",
                text: "Đồng bộ Zalo OA, gửi thông báo ZNS, định danh khách hàng & chia sẻ link.",
              },
            ].map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <IconComp size={22} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Kho mẫu Demo (#demo-gallery) */}
      <section id="demo-gallery" className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-brand-600">
                Kho mẫu thực tế
              </div>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-900 md:text-3xl">
                Mẫu Mini App theo ngành
              </h2>
            </div>

            <Input
              allowClear
              size="large"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              prefix={<LuSearch size={17} className="text-slate-400" />}
              placeholder="Tìm mẫu theo tên, ngành..."
              className="w-full md:w-80"
            />
          </div>

          <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-2">
            {categories.map((c) => (
              <Button
                key={c.id}
                type={activeCat === c.id ? "primary" : "default"}
                onClick={() => setActiveCat(c.id)}
                className="shrink-0 font-semibold"
              >
                {c.label}
              </Button>
            ))}
          </div>

          <div className="mt-3 text-xs font-medium text-slate-500">
            Hiển thị {filtered.length} mẫu
          </div>

          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => {
              const thumb = templateThumbnails[t.id];
              return (
                <article
                  key={t.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div
                    onClick={() => setPreview(t)}
                    className="relative flex h-64 cursor-pointer items-center justify-center overflow-hidden bg-gradient-to-b from-[#eef4ff] to-[#f8fbff] p-4"
                  >
                    {thumb && (
                      <img
                        src={thumb}
                        alt={t.name}
                        loading="lazy"
                        className="h-full w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                    {t.featured && (
                      <Tag color="gold" className="absolute left-3 top-3 m-0 rounded-full font-bold">
                        Nổi bật
                      </Tag>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap gap-1.5">
                      {t.categories.map((c) => (
                        <Tag key={c} color="blue" className="m-0 font-semibold">
                          {getCategoryLabel(c)}
                        </Tag>
                      ))}
                    </div>

                    <h3 className="mt-2.5 text-base font-bold text-slate-900">
                      [{t.code}] {t.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {t.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.features.slice(0, 3).map((f) => (
                        <span
                          key={f}
                          className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                        >
                          {f}
                        </span>
                      ))}
                    </div>

                    <Button
                      onClick={() => setPreview(t)}
                      icon={<LuQrCode size={15} />}
                      className="mt-5 w-full font-bold text-brand-600 hover:!border-brand-600 hover:!bg-brand-600 hover:!text-white"
                    >
                      Xem mẫu & quét QR
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-slate-400">
              Không tìm thấy mẫu phù hợp với từ khoá "{keyword}"
            </div>
          )}
        </div>
      </section>

      {/* Quy trình triển khai */}
      <section id="process" className="border-y border-slate-100 bg-slate-50/60 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-brand-600">
              Quy trình làm việc
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 md:text-3xl">
              4 bước sở hữu Mini App mang thương hiệu riêng
            </h2>
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8">
            <Steps
              current={3}
              responsive
              items={[
                {
                  title: "Chọn mẫu & Tư vấn",
                  content: "Trải nghiệm kho 19 mẫu và chốt luồng tính năng phù hợp.",
                },
                {
                  title: "Tuỳ biến & Dựng API",
                  content: "Chỉnh logo, màu sắc, kết nối PostgreSQL theo nghiệp vụ.",
                },
                {
                  title: "Kiểm thử & Duyệt Zalo",
                  content: "Test iOS/Android và hỗ trợ nộp hồ sơ xét duyệt lên Zalo.",
                },
                {
                  title: "Bàn giao & Bảo hành",
                  content: "Bàn giao quản trị, cấp link/QR và bảo hành định kỳ.",
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Bảng giá */}
      <section id="pricing" className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-brand-600">
              Bảng giá dịch vụ
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 md:text-3xl">
              Chi phí minh bạch, không phát sinh
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col rounded-3xl bg-white p-7 shadow-sm ${
                  p.highlight
                    ? "border-2 border-brand-600 ring-4 ring-brand-600/10"
                    : "border border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-slate-900">{p.name}</h3>
                  {p.highlight && (
                    <Tag color="blue" className="m-0 rounded-full font-bold">
                      Phổ biến nhất
                    </Tag>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{p.desc}</p>
                <div className="mt-5">
                  <span className="text-3xl font-black text-brand-600">{p.price}</span>
                  <span className="ml-2 text-xs text-slate-400">{p.period}</span>
                </div>

                <ul className="mt-6 flex-1 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-700">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <LuCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  type={p.highlight ? "primary" : "default"}
                  size="large"
                  block
                  href="#contact"
                  onClick={() =>
                    form.setFieldValue("note", `Tôi quan tâm ${p.name} (${p.price})`)
                  }
                  className="mt-7 font-bold"
                >
                  Đăng ký gói này
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-100 bg-slate-50/60 py-14">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-2xl font-extrabold text-slate-900">
            Câu hỏi thường gặp
          </h2>
          <Collapse
            accordion
            size="large"
            className="mt-8 bg-white shadow-sm"
            items={faqs.map((item, i) => ({
              key: String(i),
              label: <span className="font-bold text-slate-900">{item.q}</span>,
              children: <p className="text-sm leading-relaxed text-slate-600">{item.a}</p>,
            }))}
          />
        </div>
      </section>

      {/* Liên hệ / Form tư vấn */}
      <section id="contact" className="py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="text-xs font-bold uppercase tracking-widest text-brand-600">
              Liên hệ triển khai
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 md:text-3xl">
              Nhận tư vấn & báo giá miễn phí
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Để lại thông tin bên cạnh, kỹ thuật viên của <b>{siteConfig.brand}</b> ({siteConfig.owner})
              sẽ liên hệ tư vấn kịch bản và gửi bản demo theo ngành của bạn.
            </p>

            <div className="mt-6 space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-5 text-sm">
              <div className="font-bold text-slate-900">
                {siteConfig.brand} · Đơn vị chủ quản: {siteConfig.owner}
              </div>
              <div className="flex items-start gap-2.5 text-slate-600">
                <LuPhoneCall size={17} className="mt-0.5 shrink-0 text-brand-600" />
                <span>Hotline / Zalo: {siteConfig.phoneDisplay}</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-600">
                <LuMail size={17} className="mt-0.5 shrink-0 text-brand-600" />
                <span>Email: {siteConfig.email}</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-600">
                <LuMapPin size={17} className="mt-0.5 shrink-0 text-brand-600" />
                <span>{siteConfig.address}</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-600">
                <LuClock size={17} className="mt-0.5 shrink-0 text-brand-600" />
                <span>{siteConfig.workingHours}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 lg:col-span-7">
            <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Form.Item
                  label="Họ và tên"
                  name="name"
                  rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
                >
                  <Input placeholder="Nguyễn Văn A" />
                </Form.Item>

                <Form.Item
                  label="Số điện thoại (Zalo)"
                  name="phone"
                  rules={[
                    { required: true, message: "Vui lòng nhập số điện thoại" },
                    {
                      pattern: /^0\d{9}$/,
                      message: "Số điện thoại phải gồm 10 số bắt đầu bằng 0",
                    },
                  ]}
                >
                  <Input placeholder="09xx xxx xxx" inputMode="tel" />
                </Form.Item>
              </div>

              <div className="grid gap-x-4 sm:grid-cols-2">
                <Form.Item label="Ngành kinh doanh" name="industry">
                  <Select
                    allowClear
                    placeholder="Chọn ngành nghề"
                    options={[
                      ...categories.slice(1).map((c) => ({ value: c.label, label: c.label })),
                      { value: "Khác", label: "Ngành khác" },
                    ]}
                  />
                </Form.Item>

                <Form.Item label="Mẫu quan tâm" name="templateId">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn mẫu (nếu có)"
                    options={demoTemplates.map((t) => ({
                      value: t.id,
                      label: `[${t.code}] ${t.name}`,
                    }))}
                  />
                </Form.Item>
              </div>

              <Form.Item label="Nhu cầu triển khai" name="note">
                <Input.TextArea
                  rows={3}
                  placeholder="Mô tả sơ qua chức năng bạn cần (bán hàng, đặt lịch, check công KCN...)"
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={submitting}
                className="h-12 font-bold"
              >
                Gửi yêu cầu tư vấn ngay
              </Button>
            </Form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-900 py-8 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-6xl px-4">
          © {dayjs().year()} <b className="text-white">{siteConfig.brand}</b> · Nền tảng Zalo Mini
          App {siteConfig.appName} · Đơn vị chủ quản:{" "}
          <span className="text-slate-200">{siteConfig.owner}</span>
        </div>
      </footer>

      <PreviewModal
        template={preview}
        onClose={() => setPreview(null)}
        onSelectForQuote={handleSelectForQuote}
      />
    </div>
  );
}
