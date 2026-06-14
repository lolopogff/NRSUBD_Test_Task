/**
 * Синхронизация сообщений выбранного кейса.
 *
 * Два канала (как в советe ТЗ):
 * 1. WebSocket — мгновенная доставка новых сообщений (message_created)
 * 2. Polling каждые 15 с — fallback при обрыве WS и для edit/delete
 */
import { useEffect } from "react";
import { Message } from "../types";
import { useAppDispatch } from "../hooks";
import { fetchMessages, receiveLiveMessage } from "../slices/messagesSlice";

function getWebSocketUrl(requestId: string, token: string): string {
  const apiBase = process.env.REACT_APP_API_URL ?? "http://localhost:4000";
  const url = new URL(apiBase);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.searchParams.set("requestId", requestId);
  url.searchParams.set("token", token);
  return url.toString();
}

export function useMessageSync(
  selectedRequestId: string | null,
  token: string | null,
): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!selectedRequestId) return;
    // Первичная загрузка истории (до 100 последних сообщений).
    void dispatch(fetchMessages(selectedRequestId));

    // Периодическая синхронизация — резервный канал относительно WebSocket.
    const interval = setInterval(() => {
      void dispatch(fetchMessages(selectedRequestId));
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [dispatch, selectedRequestId]);

  useEffect(() => {
    if (!selectedRequestId || !token) return;

    const socket = new WebSocket(getWebSocketUrl(selectedRequestId, token));

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as {
          type?: string;
          requestId?: string;
          message?: Message;
        };

        if (
          parsed.type === "message_created" &&
          parsed.requestId &&
          parsed.message
        ) {
          dispatch(
            receiveLiveMessage({
              requestId: parsed.requestId,
              message: parsed.message,
            }),
          );
        }
      } catch (_error) {
        // Ignore malformed payloads to keep UI resilient.
      }
    };

    return () => {
      socket.close();
    };
  }, [dispatch, selectedRequestId, token]);
}
