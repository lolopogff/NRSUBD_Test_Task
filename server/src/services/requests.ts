/**
 * Правовые запросы.
 *
 * Один кейс = один чат + статус обработки (new => in_progress => resolved).
 * При создании кейса автоматически добавляется приветственное системное сообщение.
 */
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db";
import { mapLegalRequestRow } from "../mappers";
import {
  AuthContext,
  LegalRequest,
  LegalRequestRow,
  RequestStatus,
} from "../types";

export async function findRequestOwner(
  requestId: string,
): Promise<{ ownerUserId: string | null } | null> {
  const result = await pool.query<{ owner_user_id: string | null }>(
    `SELECT owner_user_id
     FROM legal_requests
     WHERE id = $1`,
    [requestId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return { ownerUserId: result.rows[0].owner_user_id };
}

export async function canAccessRequest(
  auth: AuthContext,
  requestId: string,
): Promise<boolean> {
  const requestOwner = await findRequestOwner(requestId);
  if (!requestOwner) {
    return false;
  }
  return auth.role === "specialist" || requestOwner.ownerUserId === auth.userId;
}

export async function listRequests(auth: AuthContext): Promise<LegalRequest[]> {
  const result =
    auth.role === "specialist"
      ? await pool.query<LegalRequestRow>(
          `SELECT id, title, description, status, created_at
           FROM legal_requests
           ORDER BY created_at DESC`,
        )
      : await pool.query<LegalRequestRow>(
          `SELECT id, title, description, status, created_at
           FROM legal_requests
           WHERE owner_user_id = $1
           ORDER BY created_at DESC`,
          [auth.userId],
        );

  return result.rows.map(mapLegalRequestRow);
}

export async function createRequest(payload: {
  title: string;
  description: string;
  ownerUserId: string;
}): Promise<LegalRequest> {
  const legalRequest: LegalRequest = {
    id: uuidv4(),
    title: payload.title,
    description: payload.description,
    status: "new",
    createdAt: new Date().toISOString(),
  };

  await pool.query(
    `INSERT INTO legal_requests (id, title, description, status, created_at, owner_user_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      legalRequest.id,
      legalRequest.title,
      legalRequest.description,
      legalRequest.status,
      legalRequest.createdAt,
      payload.ownerUserId,
    ],
  );

  // Системное сообщение: пользователь сразу видит, что запрос принят в работу.
  await pool.query(
    `INSERT INTO messages (id, request_id, created_by_user_id, author_name, text)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      uuidv4(),
      legalRequest.id,
      null,
      "Система",
      "Запрос создан. Наш специалист скоро свяжется с вами.",
    ],
  );

  return legalRequest;
}

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
): Promise<LegalRequest | null> {
  const result = await pool.query<LegalRequestRow>(
    `UPDATE legal_requests
     SET status = $1
     WHERE id = $2
     RETURNING id, title, description, status, created_at`,
    [status, requestId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapLegalRequestRow(result.rows[0]);
}

export async function deleteRequest(requestId: string): Promise<void> {
  await pool.query(`DELETE FROM legal_requests WHERE id = $1`, [requestId]);
}
