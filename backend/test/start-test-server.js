// Chạy backend riêng cho test tích hợp: cổng 4010, tắt giới hạn tần suất. Không ảnh hưởng server dev cổng 4000.
process.env.PORT = process.env.PORT || "4010";
process.env.RATE_LIMIT_DISABLED = "true";
// OA giả để test chữ ký webhook (không gọi Zalo thật)
process.env.ZALO_APP_ID = process.env.ZALO_APP_ID || "t_app";
process.env.ZALO_OA_SECRET = process.env.ZALO_OA_SECRET || "t_oa_secret";
process.env.NODE_ENV = process.env.NODE_ENV === "production" ? "development" : process.env.NODE_ENV || "development";
require("ts-node/register/transpile-only");
require("../src/main");
