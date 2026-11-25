import { App as AntApp, Button, Form, Input, Modal } from "antd";
import { useEffect, useMemo, useState } from "react";
import { LuArrowLeft, LuArrowRight, LuCheck, LuSparkles } from "react-icons/lu";
import { templateThumbnails } from "../assets/thumbs";
import { categories, CategoryId, demoTemplates, DemoTemplate } from "../data/site";
import { createStore, StoreWithOwner } from "../data/store-api";
import { ApiError } from "../data/platform-api";

/** "Cà phê Nhà Gỗ" → "ca-phe-nha-go" */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

type Info = { name: string; slug: string; subtitle?: string; phone?: string; address?: string };

/** Trình tạo store 2 bước: chọn mẫu giao diện → thông tin cửa hàng. */
export default function CreateStoreWizard({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (store: StoreWithOwner) => void;
}) {
  const { message } = AntApp.useApp();
  const [step, setStep] = useState<0 | 1>(0);
  const [cat, setCat] = useState<CategoryId>("all");
  const [tpl, setTpl] = useState<DemoTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form] = Form.useForm<Info>();
  const name = Form.useWatch("name", form) ?? "";
  const subtitle = Form.useWatch("subtitle", form) ?? "";

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setTpl(null);
    setCat("all");
    setSlugTouched(false);
    form.resetFields();
  }, [open, form]);

  const usedCats = useMemo(
    () => categories.filter((c) => c.id === "all" || demoTemplates.some((t) => t.categories.includes(c.id as never))),
    [],
  );
  const list = cat === "all" ? demoTemplates : demoTemplates.filter((t) => t.categories.includes(cat as never));

  const submit = async (values: Info) => {
    if (!tpl) return setStep(0);
    setSaving(true);
    try {
      const created = await createStore({
        name: values.name.trim(),
        slug: values.slug,
        subtitle: values.subtitle?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        templateId: tpl.id,
        theme: {
          primary: tpl.color,
          accent: "#f59e0b",
          bg: "#f5f6f8",
          headerVariant: "pastel",
          bannerVariant: "editorial",
          productCardVariant: "editorial",
          memberCardVariant: "minimal",
        },
        sliders: [
          {
            id: `sl_${Date.now()}`,
            eyebrow: "CHÀO MỪNG",
            title: `Chào mừng đến với ${values.name.trim()}`,
            subtitle: values.subtitle?.trim() || "Ưu đãi dành riêng cho khách đặt qua Zalo Mini App",
            from: tpl.color,
            to: "#3b82f6",
            cta: "Khám phá",
          },
        ],
      });
      message.success(`Đã tạo store "${created.name}"`);
      onCreated(created);
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : "Tạo store thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={step === 0 ? 1040 : 820} destroyOnHidden centered>
      {/* Stepper */}
      <div className="mb-5 flex items-center gap-3 pr-8">
        {["Chọn mẫu giao diện", "Thông tin cửa hàng"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <div className={`h-px w-8 ${step >= i ? "bg-brand-600" : "bg-slate-200"}`} />}
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step > i ? "bg-brand-600 text-white" : step === i ? "bg-brand-50 text-brand-600 ring-2 ring-brand-600" : "bg-slate-100 text-slate-400"
              }`}
            >
              {step > i ? <LuCheck size={14} /> : i + 1}
            </span>
            <span className={`text-sm font-bold ${step === i ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Bạn kinh doanh lĩnh vực nào?</h2>
          <p className="mt-1 text-sm text-slate-500">Chọn một mẫu gần nhất — bạn có thể tuỳ biến toàn bộ giao diện sau.</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {usedCats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  cat === c.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="-mx-1.5 mt-2.5 grid max-h-[56vh] grid-cols-2 gap-3 overflow-y-auto p-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((t) => {
              const selected = tpl?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTpl(t)}
                  onDoubleClick={() => {
                    setTpl(t);
                    setStep(1);
                  }}
                  className={`group relative overflow-hidden rounded-2xl border bg-white text-left transition ${
                    selected ? "border-brand-600 ring-2 ring-brand-600" : "border-slate-200 hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                >
                  <div className="aspect-[6/5] overflow-hidden bg-slate-100">
                    {templateThumbnails[t.id] ? (
                      <img src={templateThumbnails[t.id]} alt={t.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full" style={{ background: t.color }} />
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.color }} />
                      <span className="truncate text-sm font-bold text-slate-900">{t.name}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">{t.features.join(" · ")}</div>
                  </div>
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white shadow">
                      <LuCheck size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm text-slate-500">
              {tpl ? (
                <>
                  Đã chọn: <b className="text-slate-900">{tpl.name}</b>
                </>
              ) : (
                "Chưa chọn mẫu"
              )}
            </span>
            <Button type="primary" size="large" disabled={!tpl} onClick={() => setStep(1)}>
              Tiếp tục <LuArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {step === 1 && tpl && (
        <div className="grid gap-6 md:grid-cols-[1fr_260px]">
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={submit}
            onValuesChange={(changed: Partial<Info>) => {
              if ("name" in changed && !slugTouched) form.setFieldValue("slug", slugify(changed.name ?? ""));
            }}
          >
            <h2 className="mb-4 text-lg font-extrabold text-slate-900">Thông tin cửa hàng</h2>
            <Form.Item label="Tên cửa hàng" name="name" rules={[{ required: true, message: "Nhập tên cửa hàng" }]}>
              <Input size="large" placeholder="VD: Cà phê Nhà Gỗ" autoFocus />
            </Form.Item>
            <Form.Item
              label="Mã định danh (slug)"
              name="slug"
              extra="Tự tạo từ tên cửa hàng — duy nhất, chỉ gồm chữ thường không dấu, số và dấu gạch ngang."
              rules={[
                { required: true, message: "Nhập mã định danh" },
                { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: "Chỉ chữ thường không dấu, số và dấu gạch ngang" },
              ]}
            >
              <Input size="large" placeholder="ca-phe-nha-go" onChange={() => setSlugTouched(true)} />
            </Form.Item>
            <Form.Item label="Slogan / mô tả ngắn" name="subtitle">
              <Input size="large" placeholder="VD: Cà phê rang xay nguyên chất" maxLength={80} />
            </Form.Item>
            <div className="grid gap-x-3 sm:grid-cols-2">
              <Form.Item label="Hotline" name="phone">
                <Input size="large" placeholder="09xx xxx xxx" />
              </Form.Item>
              <Form.Item label="Địa chỉ" name="address">
                <Input size="large" />
              </Form.Item>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <Button size="large" type="text" icon={<LuArrowLeft size={16} />} onClick={() => setStep(0)}>
                Đổi mẫu
              </Button>
              <Button type="primary" size="large" htmlType="submit" loading={saving} icon={<LuSparkles size={16} />} className="font-bold">
                Tạo store
              </Button>
            </div>
          </Form>

          {/* Xem trước */}
          <div className="hidden md:block">
            <div className="sticky top-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
              <div className="aspect-[6/5] overflow-hidden bg-slate-100">
                {templateThumbnails[tpl.id] && <img src={templateThumbnails[tpl.id]} alt={tpl.name} className="h-full w-full object-cover" />}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black text-white"
                    style={{ background: tpl.color }}
                  >
                    {(name.trim()[0] ?? "S").toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-slate-900">{name.trim() || "Tên cửa hàng"}</div>
                    <div className="truncate text-xs text-slate-500">{subtitle.trim() || tpl.name}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {tpl.features.map((f) => (
                    <span key={f} className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-semibold text-slate-600">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
