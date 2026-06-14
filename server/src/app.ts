/**
 * Сборка Express-приложения.
 *
 * Слои:
 * - routes/     — HTTP-контроллеры (тонкий слой, без SQL)
 * - services/   — бизнес-логика и запросы к БД
 * - middleware/ — авторизация и проверка доступа к кейсу
 * - websocket/  — real-time доставка новых сообщений
 */
import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth";
import healthRoutes from "./routes/health";
import messageRoutes from "./routes/messages";
import requestRoutes from "./routes/requests";

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/requests", requestRoutes);
  // Сообщения привязаны к конкретному правовому запросу (кейсу).
  app.use("/api/requests/:requestId/messages", messageRoutes);

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      // eslint-disable-next-line no-console
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}
