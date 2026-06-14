/**
 * Типы frontend — зеркало контракта REST API backend.
 * User.name — «представление» пользователя системе (требование ТЗ).
 */
export type RequestStatus = "new" | "in_progress" | "resolved";
export type UserRole = "user" | "specialist";

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
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
