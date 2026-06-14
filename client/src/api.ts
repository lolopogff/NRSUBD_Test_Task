/**
 * HTTP-клиент backend API.
 * Все защищённые запросы передают JWT через Authorization: Bearer.
 * Базовый URL задаётся REACT_APP_API_URL (по умолчанию localhost:4000).
 */
import { AuthResponse, LegalRequest, Message, RequestStatus, UserRole } from "./types";

const API_BASE = process.env.REACT_APP_API_URL ?? "http://localhost:4000";

async function request<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const { token, ...requestOptions } = options ?? {};
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(requestOptions.headers ?? {}),
    },
    ...requestOptions,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function registerUser(payload: {
  name: string;
  username: string;
  password: string;
  role: UserRole;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: {
  username: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getRequests(token: string): Promise<LegalRequest[]> {
  return request<LegalRequest[]>("/api/requests", { token });
}

export function createRequest(payload: {
  title: string;
  description: string;
  token: string;
}): Promise<LegalRequest> {
  return request<LegalRequest>("/api/requests", {
    method: "POST",
    token: payload.token,
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
    }),
  });
}

export function updateRequestStatus(payload: {
  requestId: string;
  status: RequestStatus;
  token: string;
}): Promise<LegalRequest> {
  return request<LegalRequest>(`/api/requests/${payload.requestId}/status`, {
    method: "PATCH",
    token: payload.token,
    body: JSON.stringify({ status: payload.status }),
  });
}

export function deleteRequest(payload: {
  requestId: string;
  token: string;
}): Promise<void> {
  return request<void>(`/api/requests/${payload.requestId}`, {
    method: "DELETE",
    token: payload.token,
  });
}

/** limit=100 — последние N сообщений; параметр before на API для подгрузки старых. */
export function getMessages(
  requestId: string,
  limit = 100,
  token: string,
): Promise<Message[]> {
  return request<Message[]>(`/api/requests/${requestId}/messages?limit=${limit}`, {
    token,
  });
}

export function sendMessage(payload: {
  requestId: string;
  text: string;
  token: string;
}): Promise<Message> {
  return request<Message>(`/api/requests/${payload.requestId}/messages`, {
    method: "POST",
    token: payload.token,
    body: JSON.stringify({
      text: payload.text,
    }),
  });
}

export function updateMessage(payload: {
  requestId: string;
  messageId: string;
  text: string;
  token: string;
}): Promise<Message> {
  return request<Message>(
    `/api/requests/${payload.requestId}/messages/${payload.messageId}`,
    {
      method: "PATCH",
      token: payload.token,
      body: JSON.stringify({ text: payload.text }),
    },
  );
}

export function deleteMessage(payload: {
  requestId: string;
  messageId: string;
  token: string;
}): Promise<Message> {
  return request<Message>(
    `/api/requests/${payload.requestId}/messages/${payload.messageId}`,
    {
      method: "DELETE",
      token: payload.token,
    },
  );
}
