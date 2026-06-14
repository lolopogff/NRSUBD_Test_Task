/**
 * Доменные типы backend.
 *
 * LegalRequest — «правовой запрос» (кейс): единица работы, внутри которой ведётся чат.
 * Message — сообщение в чате кейса; authorId = null для системных сообщений.
 *
 * *Row-типы — snake_case-формат строк PostgreSQL до маппинга в API-ответ (camelCase).
 */

export type RequestStatus = "new" | "in_progress" | "resolved";
export type UserRole = "user" | "specialist";

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
}

export interface UserRow extends User {
  password_hash: string;
}

export interface LegalRequest {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  requestId: string;
  authorId: string | null;
  authorName: string;
  text: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
}

/** Событие WebSocket: новое сообщение в чате кейса. */
export interface MessageCreatedEvent {
  type: "message_created";
  requestId: string;
  message: Message;
}

/** Данные авторизованного пользователя после проверки JWT. */
export interface AuthContext {
  userId: string;
  role: UserRole;
}

export interface TokenPayload {
  sub: string;
  role: UserRole;
}

export interface LegalRequestRow {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  created_at: Date | string;
}

export interface MessageRow {
  id: string;
  request_id: string;
  created_by_user_id: string | null;
  author_name: string;
  text: string;
  is_deleted: boolean;
  deleted_at: Date | string | null;
  created_at: Date | string;
}

// После middleware requireAuth контекст доступен как req.auth.
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
