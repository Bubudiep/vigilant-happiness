import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as fs from "fs";
import * as path from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  const uploadsDir = path.join(process.cwd(), "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: "/uploads/" });

  const origins = (config.get<string>("CORS_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const frontendUrl = (config.get<string>("FRONTEND_URL") ?? "").trim().replace(/\/+$/, "");
  if (frontendUrl && !origins.includes(frontendUrl)) {
    origins.push(frontendUrl);
  }
  if (config.get<string>("NODE_ENV") !== "production" && !origins.includes("http://localhost:5173")) {
    origins.push("http://localhost:5173");
  }

  // Zalo Mini App chạy trên các domain của Zalo (h5.zdn.vn, h5.zadn.vn, *.zalo.me...) —
  // chấp nhận theo mẫu, tắt được bằng ZALO_CORS=false. Thêm domain khác qua CORS_ORIGINS.
  const allowZalo = (config.get<string>("ZALO_CORS") ?? "true") !== "false";
  const zaloOrigin = /^https:\/\/([a-z0-9-]+\.)*(zdn\.vn|zadn\.vn|zalo\.me|zaloapp\.com|zalo\.vn)$/i;
  const isDev = config.get<string>("NODE_ENV") !== "production";
  const devOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

  app.enableCors({
    origin: (origin, cb) => {
      // Không có Origin: curl, server-to-server, app native
      if (!origin) return cb(null, true);
      if (origins.includes(origin) || (allowZalo && zaloOrigin.test(origin)) || (isDev && devOrigin.test(origin))) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"],
    maxAge: 600,
  });

  // Đứng sau Nginx / Cloudflare thì đặt TRUST_PROXY=1 để lấy IP thật (giới hạn tần suất, chống spam).
  // Không có proxy mà vẫn bật thì client có thể giả IP qua header X-Forwarded-For.
  const trustProxy = config.get<string>("TRUST_PROXY");
  if (trustProxy) app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("reMini Backend API")
    .setDescription("API cho Zalo Mini App reMini (Hộ kinh doanh A)")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = config.get<number>("PORT") ?? 4000;
  await app.listen(port);
  console.log(`reMini API listening on http://localhost:${port}/api (Docs: /api/docs)`);
}

bootstrap();
