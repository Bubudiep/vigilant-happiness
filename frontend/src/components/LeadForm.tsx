import { App as AntApp, Button, Form, Input, Select } from "antd";
import { useEffect, useState } from "react";
import { categories, demoTemplates, siteConfig } from "../data/site";

export interface LeadFormValues {
  name: string;
  phone: string;
  industry?: string;
  templateId?: string;
  note?: string;
}

/** Điền sẵn một số trường (đổi `seq` để áp dụng lại). */
export interface LeadPrefill {
  seq: number;
  values: Partial<LeadFormValues>;
}

/** Form nhận tư vấn trên trang chủ (tải riêng chunk để giảm bundle ban đầu). */
export default function LeadForm({ prefill }: { prefill?: LeadPrefill }) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<LeadFormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (prefill) form.setFieldsValue(prefill.values);
  }, [prefill, form]);

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

  return (
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
  );
}
