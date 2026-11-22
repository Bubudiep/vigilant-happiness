import { ReactNode } from "react";
import { LuClock, LuMail, LuMapPin, LuPhoneCall } from "react-icons/lu";
import { RiChat3Fill } from "react-icons/ri";
import { company } from "@/data/company";
import { callCompany, chatWithCompany } from "@/utils/zalo";

import ConsultationForm from "./consultation-form";
import Section from "./section";

export default function Contact() {
  return (
    <Section id="contact" eyebrow="Liên hệ" title="Nhận tư vấn miễn phí">
      <ConsultationForm />

      <div className="mt-4 space-y-3 rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5">
        <div>
          <div className="font-bold text-gray-900">{company.name}</div>
          <div className="text-xs text-gray-500">Đơn vị chủ quản: {company.owner}</div>
        </div>
        <InfoRow icon={<LuMapPin size={18} />} text={company.address} />
        <InfoRow icon={<LuPhoneCall size={18} />} text={company.phoneDisplay} />
        <InfoRow icon={<LuMail size={18} />} text={company.email} />
        <InfoRow icon={<LuClock size={18} />} text={company.workingHours} />
        <div className="flex gap-3 pt-1">
          <button
            onClick={callCompany}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-2.5 font-semibold text-brand-700"
          >
            <LuPhoneCall size={17} /> Gọi ngay
          </button>
          <button
            onClick={() => chatWithCompany()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-2.5 font-semibold text-white"
          >
            <RiChat3Fill size={18} /> Chat Zalo
          </button>
        </div>
      </div>

      <div className="py-8 text-center text-[11px] text-gray-400">
        © {new Date().getFullYear()} {company.name} · Thuộc {company.owner} · {company.website}
      </div>
    </Section>
  );
}

function InfoRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 text-gray-600">
      <span className="mt-0.5 text-brand-600">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
