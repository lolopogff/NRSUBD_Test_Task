/**
 * Сообщения чата.
 *
 * listMessages поддерживает пагинацию: limit (до 100) и before (ISO-timestamp)
 * для подгрузки более старых сообщений.
 *
 * Удаление — «мягкое»: текст заменяется, is_deleted = true (история сохраняется).
 */
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db";
import { mapMessageRow } from "../mappers";
import { Message, MessageRow } from "../types";

export async function listMessages(
  requestId: string,
  limit: number,
  before: string | null,
): Promise<Message[]> {
  const result = before
    ? await pool.query<MessageRow>(
        `SELECT id, request_id, created_by_user_id, author_name, text, is_deleted, deleted_at, created_at
         FROM messages
         WHERE request_id = $1 AND created_at < $2::timestamptz
         ORDER BY created_at DESC
         LIMIT $3`,
        [requestId, before, limit],
      )
    : await pool.query<MessageRow>(
        `SELECT id, request_id, created_by_user_id, author_name, text, is_deleted, deleted_at, created_at
         FROM messages
         WHERE request_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [requestId, limit],
      );

  // API отдаёт сообщения в хронологическом порядке (старые => новые).
  return result.rows
    .map(mapMessageRow)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export async function createMessage(payload: {
  requestId: string;
  authorId: string;
  authorName: string;
  text: string;
}): Promise<Message> {
  const result = await pool.query<MessageRow>(
    `INSERT INTO messages (id, request_id, created_by_user_id, author_name, text)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, request_id, created_by_user_id, author_name, text, is_deleted, deleted_at, created_at`,
    [uuidv4(), payload.requestId, payload.authorId, payload.authorName, payload.text],
  );

  return mapMessageRow(result.rows[0]);
}

export async function findMessageOwnership(
  requestId: string,
  messageId: string,
): Promise<{ createdByUserId: string | null; isDeleted: boolean } | null> {
  const result = await pool.query<{
    created_by_user_id: string | null;
    is_deleted: boolean;
  }>(
    `SELECT created_by_user_id, is_deleted
     FROM messages
     WHERE id = $1 AND request_id = $2`,
    [messageId, requestId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    createdByUserId: result.rows[0].created_by_user_id,
    isDeleted: result.rows[0].is_deleted,
  };
}

export async function updateMessageText(
  requestId: string,
  messageId: string,
  text: string,
): Promise<Message | null> {
  const result = await pool.query<MessageRow>(
    `UPDATE messages
     SET text = $1
     WHERE id = $2 AND request_id = $3
     RETURNING id, request_id, created_by_user_id, author_name, text, is_deleted, deleted_at, created_at`,
    [text, messageId, requestId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapMessageRow(result.rows[0]);
}

export async function softDeleteMessage(
  requestId: string,
  messageId: string,
): Promise<Message | null> {
  const result = await pool.query<MessageRow>(
    `UPDATE messages
     SET text = $1, is_deleted = TRUE, deleted_at = NOW()
     WHERE id = $2 AND request_id = $3
     RETURNING id, request_id, created_by_user_id, author_name, text, is_deleted, deleted_at, created_at`,
    ["Сообщение удалено пользователем", messageId, requestId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapMessageRow(result.rows[0]);
}
