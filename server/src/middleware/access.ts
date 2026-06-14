/**
 * Проверка доступа к правовому запросу.
 *
 * Правило: specialist видит все кейсы; user — только свои.
 * Используется перед чтением/записью сообщений и удалением кейса.
 */
import express from "express";
import { canAccessRequest, findRequestOwner } from "../services/requests";
import { AuthContext } from "../types";

/** Возвращает false и отправляет 404/403, если доступ запрещён. */
export async function ensureRequestAccess(
  auth: AuthContext,
  requestId: string,
  res: express.Response,
): Promise<boolean> {
  const requestOwner = await findRequestOwner(requestId);
  if (!requestOwner) {
    res.status(404).json({ error: "Request not found" });
    return false;
  }

  const hasAccess =
    auth.role === "specialist" || requestOwner.ownerUserId === auth.userId;
  if (!hasAccess) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }

  return true;
}

/**
 * Как ensureRequestAccess, но различает «кейс не найден» (404)
 * и «кейс чужой» (403).
 */
export async function ensureRequestExistsOrForbidden(
  auth: AuthContext,
  requestId: string,
  res: express.Response,
): Promise<boolean> {
  const hasAccess = await canAccessRequest(auth, requestId);
  if (hasAccess) {
    return true;
  }

  const requestOwner = await findRequestOwner(requestId);
  if (!requestOwner) {
    res.status(404).json({ error: "Request not found" });
  } else {
    res.status(403).json({ error: "Forbidden" });
  }

  return false;
}
