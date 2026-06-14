/**
 * Middleware авторизации для защищённых REST-эндпоинтов.
 *
 * Проверяет JWT из заголовка Authorization: Bearer <token>,
 * затем убеждается, что пользователь с такой ролью существует в БД.
 * При успехе записывает req.auth для следующих обработчиков.
 */
import express from "express";
import { actorExists, parseAuthContext } from "../services/auth";

export function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  void (async () => {
    const auth = parseAuthContext(req);
    if (!auth) {
      res.status(401).json({ error: "Missing or invalid auth token" });
      return;
    }

    const validActor = await actorExists(auth);
    if (!validActor) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.auth = auth;
    next();
  })().catch(next);
}
