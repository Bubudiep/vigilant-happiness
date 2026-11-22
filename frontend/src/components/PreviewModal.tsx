import { Button, Modal, QRCode, Tag } from "antd";
import { LuArrowRight, LuExternalLink } from "react-icons/lu";
import { templateThumbnails } from "../assets/thumbs";
import { DemoTemplate, getCategoryLabel, getZaloTemplateUrl } from "../data/site";

export default function PreviewModal({
  template,
  onClose,
  onSelectForQuote,
}: {
  template: DemoTemplate | null;
  onClose: () => void;
  onSelectForQuote: (template: DemoTemplate) => void;
}) {
  if (!template) return null;

  const zaloUrl = getZaloTemplateUrl(template.id);
  const thumb = templateThumbnails[template.id];

  return (
    <Modal
      open={!!template}
      onCancel={onClose}
      footer={null}
      width={780}
      centered
      title={
        <div className="flex items-center gap-2.5 pr-6">
          <Tag color="blue" className="m-0 font-bold">
            {template.code}
          </Tag>
          <span className="text-base font-bold text-slate-900">
            {template.name} ({template.brand})
          </span>
        </div>
      }
    >
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-4">
          {thumb && (
            <img
              src={thumb}
              alt={template.name}
              className="h-80 w-auto rounded-2xl object-contain shadow-sm"
            />
          )}
        </div>

        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex flex-wrap justify-center gap-1.5">
            {template.categories.map((c) => (
              <Tag key={c} color="blue" className="m-0 rounded-full px-3 py-0.5 font-semibold">
                {getCategoryLabel(c)}
              </Tag>
            ))}
          </div>

          <h4 className="mt-3 text-xl font-extrabold text-slate-900">
            Trải nghiệm mẫu trên Zalo
          </h4>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Mở trình quét QR trong ứng dụng Zalo để dùng thử trực tiếp mẫu Mini App này.
          </p>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
            <QRCode value={zaloUrl} size={184} bordered={false} />
          </div>

          <div className="mt-4 flex w-full flex-col gap-2.5">
            <Button
              size="large"
              block
              href={zaloUrl}
              target="_blank"
              rel="noreferrer"
              icon={<LuExternalLink size={16} />}
            >
              Mở link trực tiếp trên Zalo
            </Button>
            <Button
              type="primary"
              size="large"
              block
              onClick={() => onSelectForQuote(template)}
              icon={<LuArrowRight size={16} />}
              iconPlacement="end"
              className="font-bold"
            >
              Tư vấn làm mẫu này
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
