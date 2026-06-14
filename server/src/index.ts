/**
 * Точка входа backend.
 *
 * Здесь только bootstrap: HTTP-сервер, WebSocket и graceful shutdown.
 * Маршруты, middleware и бизнес-логика вынесены в отдельные модули (см. app.ts, routes/, services/).
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { createApp } from "./app";
import { port } from "./config";
import { pool } from "./db";
import { attachWebSocketServer } from "./websocket/hub";

const app = createApp();
const httpServer = createServer(app);
// WebSocket разделяет тот же HTTP-порт, что и REST API (path: /ws).
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

attachWebSocketServer(wss);

async function start(): Promise<void> {

  const server = httpServer.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
  });

  const shutdown = async () => {
    server.close();
    wss.close();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
