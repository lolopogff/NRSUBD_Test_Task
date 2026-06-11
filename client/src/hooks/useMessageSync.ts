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
    void dispatch(fetchMessages(selectedRequestId));

    // Periodic sync fallback, WebSocket handles near-real-time updates.
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
