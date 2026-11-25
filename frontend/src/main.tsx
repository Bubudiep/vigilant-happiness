import { App as AntApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./fonts.css";
import "./index.css";

dayjs.locale("vi");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ConfigProvider
        locale={viVN}
        theme={{
          token: {
            colorPrimary: "#1657f3",
            fontFamily: '"Be Vietnam Pro", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontSize: 13,
            fontSizeSM: 12,
            fontSizeLG: 14,
            controlHeight: 32,
            controlHeightSM: 26,
            controlHeightLG: 38,
            borderRadius: 8,
            borderRadiusLG: 12,
            colorBorder: "#e2e8f0", // slate-200
            colorBorderSecondary: "#f1f5f9", // slate-100
            colorText: "#0f172a", // slate-900
            colorTextSecondary: "#64748b", // slate-500
          },
          components: {
            Table: { headerBg: "#f8fafc", headerColor: "#475569", fontSize: 13, cellPaddingBlock: 8, cellPaddingInline: 12 },
            Card: { paddingLG: 16 },
            Modal: { titleFontSize: 15 },
            Drawer: { fontSizeLG: 15 },
            Segmented: { itemSelectedBg: "#ffffff" },
            Tag: { fontSizeSM: 12 },
          },
        }}
      >
        <AntApp>
          <App />
        </AntApp>
      </ConfigProvider>
    </BrowserRouter>
  </StrictMode>,
);
