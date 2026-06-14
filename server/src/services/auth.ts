/** JWT: создание и разбор токенов, извлечение auth-контекста из HTTP-запроса. */
import jwt from "jsonwebtoken";
import express from "express";
import { jwtSecret } from "../config";
import { pool } from "../db";
import { AuthContext, TokenPayload } from "../types";

export function signAuthToken(auth: AuthContext): string {
  return jwt.sign({ role: auth.role }, jwtSecret, {
    subject: auth.userId,
    expiresIn: "12h",
  });
}

export function parseAuthToken(token: string): AuthContext | null {
  try {
    const decoded = jwt.verify(token, jwtSecret) as TokenPayload;
    if (!decoded.sub || (decoded.role !== "user" && decoded.role !== "specialist")) {
      return null;
    }
    return {
      userId: decoded.sub,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

export function parseAuthContext(req: express.Request): AuthContext | null {
  const authHeader = String(req.header("authorization") ?? "");
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }
  return parseAuthToken(token);
}

/** Защита от устаревшего JWT после смены роли или удаления пользователя. */
export async function actorExists(auth: AuthContext): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1 FROM users WHERE id = $1 AND role = $2
    ) AS exists`,
    [auth.userId, auth.role],
  );
  return result.rows[0]?.exists ?? false;
}
