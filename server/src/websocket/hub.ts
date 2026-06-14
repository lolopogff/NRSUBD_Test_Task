/**
 * WebSocket-хаб для real-time доставки новых сообщений.
 *
 * Клиент подключается: ws://host/ws?requestId=<uuid>&token=<jwt>
 * Подписка привязана к одному кейсу; права те же, что у REST API.
 *
 * Сейчас рассылается только message_created (новые сообщения).
 * Редактирование/удаление подтягиваются клиентом через polling fallback.
 */
import { IncomingMessage } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { actorExists, parseAuthToken } from "../services/auth";
import { findRequestOwner } from "../services/requests";
import { Message, MessageCreatedEvent } from "../types";

// requestId -> множество открытых сокетов (несколько вкладок / участников).
const socketsByRequestId = new Map<string, Set<WebSocket>>();
const requestBySocket = new Map<WebSocket, string>();

function subscribeSocketToRequest(socket: WebSocket, requestId: string): void {
  let set = socketsByRequestId.get(requestId);
  if (!set) {
    set = new Set<WebSocket>();
    socketsByRequestId.set(requestId, set);
  }
  set.add(socket);
  requestBySocket.set(socket, requestId);
}

function unsubscribeSocket(socket: WebSocket): void {
  const requestId = requestBySocket.get(socket);
  if (!requestId) return;

  const set = socketsByRequestId.get(requestId);
  if (set) {
    set.delete(socket);
    if (set.size === 0) {
      socketsByRequestId.delete(requestId);
    }
  }
  requestBySocket.delete(socket);
}

export function broadcastMessageCreated(message: Message): void {
  const subscribers = socketsByRequestId.get(message.requestId);
  if (!subscribers || subscribers.size === 0) return;

  const payload: MessageCreatedEvent = {
    type: "message_created",
    requestId: message.requestId,
    message,
  };
  const body = JSON.stringify(payload);

  subscribers.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(body);
    }
  });
}

function handleWebSocketConnection(socket: WebSocket, req: IncomingMessage): void {
  const url = new URL(req.url ?? "", "http://localhost");
  const requestId = url.searchParams.get("requestId");
  const token = url.searchParams.get("token");

  if (!requestId || !token) {
    socket.close(1008, "requestId and token query parameters are required");
    return;
  }

  const auth = parseAuthToken(token);
  if (!auth) {
    socket.close(1008, "Unauthorized");
    return;
  }

  void (async () => {
    const validActor = await actorExists(auth);
    if (!validActor) {
      socket.close(1008, "Unauthorized");
      return;
    }

    const requestOwner = await findRequestOwner(requestId);
    if (!requestOwner) {
      socket.close(1008, "Request not found");
      return;
    }

    const hasAccess =
      auth.role === "specialist" || requestOwner.ownerUserId === auth.userId;

    if (!hasAccess) {
      socket.close(1008, "Forbidden");
      return;
    }

    subscribeSocketToRequest(socket, requestId);
    socket.on("close", () => {
      unsubscribeSocket(socket);
    });
  })().catch(() => {
    socket.close(1011, "Internal error");
  });
}

export function attachWebSocketServer(wss: WebSocketServer): void {
  wss.on("connection", handleWebSocketConnection);
}
