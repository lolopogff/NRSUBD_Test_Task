/** Преобразование строк PostgreSQL в JSON API. */
import {
  LegalRequest,
  LegalRequestRow,
  Message,
  MessageRow,
} from "../types";

export const mapLegalRequestRow = (row: LegalRequestRow): LegalRequest => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  createdAt: new Date(row.created_at).toISOString(),
});

export const mapMessageRow = (row: MessageRow): Message => ({
  id: row.id,
  requestId: row.request_id,
  authorId: row.created_by_user_id,
  authorName: row.author_name,
  text: row.text,
  isDeleted: row.is_deleted,
  deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
  createdAt: new Date(row.created_at).toISOString(),
});
