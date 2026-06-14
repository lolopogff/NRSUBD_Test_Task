import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { WebSocket, WebSocketServer } from "ws";
import { pool } from "./db";

type RequestStatus = "new" | "in_progress" | "resolved";
type UserRole = "user" | "specialist";

interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
}

interface UserRow extends User {
  password_hash: string;
}

interface LegalRequest {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  createdAt: string;
}

interface Message {
  id: string;
  requestId: string;
  authorId: string | null;
  authorName: string;
  text: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
}

interface MessageCreatedEvent {
  type: "message_created";
  requestId: string;
  message: Message;
}

interface AuthContext {
  userId: string;
  role: UserRole;
}

interface TokenPayload {
  sub: string;
  role: UserRole;
}

const app = express();
const port = process.env.PORT ?? 4000;
const jwtSecret = process.env.JWT_SECRET ?? "dev_secret_change_me";
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

const mapLegalRequestRow = (row: {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  created_at: Date | string;
}): LegalRequest => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  createdAt: new Date(row.created_at).toISOString(),
});

const mapMessageRow = (row: {
  id: string;
  request_id: string;
  created_by_user_id: string | null;
  author_name: string;
  text: string;
  is_deleted: boolean;
  deleted_at: Date | string | null;
  created_at: Date | string;
}): Message => ({
  id: row.id,
  requestId: row.request_id,
  authorId: row.created_by_user_id,
  authorName: row.author_name,
  text: row.text,
  isDeleted: row.is_deleted,
  deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
  createdAt: new Date(row.created_at).toISOString(),
});

const socketsByRequestId = new Map<string, Set<WebSocket>>();
const requestBySocket = new Map<WebSocket, string>();

const asyncHandler =
  (
    handler: (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => Promise<void>,
  ) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    void handler(req, res, next).catch(next);
  };

function getRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

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

function broadcastMessageCreated(message: Message): void {
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

function signAuthToken(auth: AuthContext): string {
  return jwt.sign({ role: auth.role }, jwtSecret, {
    subject: auth.userId,
    expiresIn: "12h",
  });
}

function parseAuthToken(token: string): AuthContext | null {
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

function parseAuthContext(req: express.Request): AuthContext | null {
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

async function actorExists(auth: AuthContext): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1 FROM users WHERE id = $1 AND role = $2
    ) AS exists`,
    [auth.userId, auth.role],
  );
  return result.rows[0]?.exists ?? false;
}

async function findRequestOwner(
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

async function seedDataIfNeeded(): Promise<void> {
  const usersCountResult = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM users",
  );
  const usersCount = Number(usersCountResult.rows[0]?.count ?? 0);

  if (usersCount === 0) {
    const specialistId = uuidv4();
    const userId = uuidv4();
    const specialistPasswordHash = await bcrypt.hash("specialist123", 10);
    const userPasswordHash = await bcrypt.hash("user12345", 10);

    await pool.query(
      `INSERT INTO users (id, name, role, username, password_hash)
       VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)`,
      [
        specialistId,
        "Специалист",
        "specialist",
        "specialist",
        specialistPasswordHash,
        userId,
        "Пользователь",
        "user",
        "user",
        userPasswordHash,
      ],
    );
  }
}

function toPublicUser(row: {
  id: string;
  name: string;
  username: string;
  role: UserRole;
}): User {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
  };
}

async function findUserByUsername(username: string): Promise<UserRow | null> {
  const result = await pool.query<{
    id: string;
    name: string;
    username: string;
    role: UserRole;
    password_hash: string;
  }>(
    `SELECT id, name, username, role, password_hash
     FROM users
     WHERE username = $1`,
    [username],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function findUserById(userId: string): Promise<User | null> {
  const result = await pool.query<{
    id: string;
    name: string;
    username: string;
    role: UserRole;
  }>(
    `SELECT id, name, username, role
     FROM users
     WHERE id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function canAccessRequest(auth: AuthContext, requestId: string): Promise<boolean> {
  const requestOwner = await findRequestOwner(requestId);
  if (!requestOwner) {
    return false;
  }
  return auth.role === "specialist" || requestOwner.ownerUserId === auth.userId;
}

app.use(cors());
app.use(express.json());

wss.on("connection", (socket, req) => {
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
});

app.get(
  "/api/health",
  asyncHandler(async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  }),
);

app.post(
  "/api/auth/register",
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name ?? "").trim();
    const username = String(req.body?.username ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");
    const role = String(req.body?.role ?? "user").trim() as UserRole;

    if (!name || !username || !password) {
      res.status(400).json({ error: "name, username and password are required" });
      return;
    }
    if (!/^[a-z0-9_]{3,32}$/.test(username)) {
      res.status(400).json({ error: "Invalid username format" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    if (role !== "user" && role !== "specialist") {
      res.status(400).json({ error: "Invalid role value" });
      return;
    }

    const existing = await findUserByUsername(username);
    if (existing) {
      res.status(409).json({ error: "Username already exists" });
      return;
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (id, name, role, username, password_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, name, role, username, passwordHash],
    );

    const user: User = {
      id: userId,
      name,
      username,
      role,
    };

    const token = signAuthToken({ userId, role });
    res.status(201).json({ user, token });
  }),
);

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const username = String(req.body?.username ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!username || !password) {
      res.status(400).json({ error: "username and password are required" });
      return;
    }

    const userRow = await findUserByUsername(username);
    if (!userRow) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = toPublicUser(userRow);
    const token = signAuthToken({ userId: user.id, role: user.role });
    res.json({ user, token });
  }),
);

app.get(
  "/api/requests",
  asyncHandler(async (req, res) => {
    const auth = parseAuthContext(req);
    if (!auth) {
      res.status(401).json({ error: "Missing or invalid auth token" });
      return;
    }
    const validActor = await actorExists(auth);
    if (!validActor) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const result =
      auth.role === "specialist"
        ? await pool.query<{
            id: string;
            title: string;
            description: string;
            status: RequestStatus;
            created_at: Date | string;
          }>(
            `SELECT id, title, description, status, created_at
             FROM legal_requests
             ORDER BY created_at DESC`,
          )
        : await pool.query<{
            id: string;
            title: string;
            description: string;
            status: RequestStatus;
            created_at: Date | string;
          }>(
            `SELECT id, title, description, status, created_at
             FROM legal_requests
             WHERE owner_user_id = $1
             ORDER BY created_at DESC`,
            [auth.userId],
          );

    res.json(result.rows.map(mapLegalRequestRow));
  }),
);

app.post(
  "/api/requests",
  asyncHandler(async (req, res) => {
    const auth = parseAuthContext(req);
    if (!auth) {
      res.status(401).json({ error: "Missing or invalid auth token" });
      return;
    }
    const validActor = await actorExists(auth);
    if (!validActor) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (auth.role !== "user") {
      res.status(403).json({ error: "Only users can create requests" });
      return;
    }

    const title = String(req.body?.title ?? "").trim();
    const description = String(req.body?.description ?? "").trim();

    if (!title || !description) {
      res.status(400).json({ error: "Title and description are required" });
      return;
    }

    const legalRequest: LegalRequest = {
      id: uuidv4(),
      title,
      description,
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
        auth.userId,
      ],
    );

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

    res.status(201).json(legalRequest);
  }),
);

app.patch(
  "/api/requests/:requestId/status",
  asyncHandler(async (req, res) => {
    const auth = parseAuthContext(req);
    if (!auth) {
      res.status(401).json({ error: "Missing or invalid auth token" });
      return;
    }
    const validActor = await actorExists(auth);
    if (!validActor) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (auth.role !== "specialist") {
      res.status(403).json({ error: "Only specialist can update status" });
      return;
    }

    const requestId = getRouteParam(req.params.requestId);
    const status = String(req.body?.status ?? "").trim() as RequestStatus;
    const allowedStatuses: RequestStatus[] = ["new", "in_progress", "resolved"];

    if (!allowedStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status value" });
      return;
    }

    const result = await pool.query<{
      id: string;
      title: string;
      description: string;
      status: RequestStatus;
      created_at: Date | string;
    }>(
      `UPDATE legal_requests
       SET status = $1
       WHERE id = $2
       RETURNING id, title, description, status, created_at`,
      [status, requestId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    res.json(mapLegalRequestRow(result.rows[0]));
  }),
);

app.delete(
  "/api/requests/:requestId",
  asyncHandler(async (req, res) => {
    const auth = parseAuthContext(req);
    if (!auth) {
      res.status(401).json({ error: "Missing or invalid auth token" });
      return;
    }
    const validActor = await actorExists(auth);
    if (!validActor) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const requestId = getRouteParam(req.params.requestId);
    const requestOwner = await findRequestOwner(requestId);
    if (!requestOwner) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const canDelete =
      auth.role === "specialist" || requestOwner.ownerUserId === auth.userId;
    if (!canDelete) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await pool.query(`DELETE FROM legal_requests WHERE id = $1`, [requestId]);
    res.status(204).send();
  }),
);

app.get(
  "/api/requests/:requestId/messages",
  asyncHandler(async (req, res) => {
    const auth = parseAuthContext(req);
    if (!auth) {
      res.status(401).json({ error: "Missing or invalid auth token" });
      return;
    }
    const validActor = await actorExists(auth);
    if (!validActor) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const requestId = getRouteParam(req.params.requestId);
    const requestOwner = await findRequestOwner(requestId);
    if (!requestOwner) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    const hasAccess =
      auth.role === "specialist" || requestOwner.ownerUserId === auth.userId;
    if (!hasAccess) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 100)));
    const beforeRaw = req.query.before ? String(req.query.before) : null;

    const result = beforeRaw
      ? await pool.query<{
          id: string;
          request_id: string;
          created_by_user_id: string | null;
          author_name: string;
          text: string;
          is_deleted: boolean;
          deleted_at: Date | string | null;
          created_at: Date | string;
        }>(
          `SELECT id, request_id, created_by_user_id, author_name, text, is_deleted, deleted_at, created_at
           FROM messages
           WHERE request_id = $1 AND created_at < $2::timestamptz
           ORDER BY created_at DESC
           LIMIT $3`,
          [requestId, beforeRaw, limit],
        )
      : await pool.query<{
          id: string;
          request_id: string;
          created_by_user_id: string | null;
          author_name: string;
          text: string;
          is_deleted: boolean;
          deleted_at: Date | string | null;
          created_at: Date | string;
        }>(
          `SELECT id, request_id, created_by_user_id, author_name, text, is_deleted, deleted_at, created_at
           FROM messages
           WHERE request_id = $1
           ORDER BY created_at DESC
           LIMIT $2`,
          [requestId, limit],
        );

    const messages = result.rows.map(mapMessageRow).sort((a, b) => {
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    });

    res.json(messages);
  }),
);

app.post(
  "/api/requests/:requestId/messages",
  asyncHandler(async (req, res) => {
    const auth = parseAuthContext(req);
    if (!auth) {
      res.status(401).json({ error: "Missing or invalid auth token" });
      return;
    }
    const validActor = await actorExists(auth);
    if (!validActor) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const requestId = getRouteParam(req.params.requestId);
    const hasAccess = await canAccessRequest(auth, requestId);
    if (!hasAccess) {
      const requestOwner = await findRequestOwner(requestId);
      if (!requestOwner) {
        res.status(404).json({ error: "Request not found" });
      } else {
        res.status(403).json({ error: "Forbidden" });
      }
      return;
    }

    const actor = await findUserById(auth.userId);
    if (!actor) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const text = String(req.body?.text ?? "").trim();

    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const result = await pool.query<{
      id: string;
      request_id: string;
      created_by_user_id: string | null;
      author_name: string;
      text: string;
      is_deleted: boolean;
      deleted_at: Date | string | null;
      created_at: Date | string;
    }>(
      `INSERT INTO messages (id, request_id, created_by_user_id, author_name, text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, request_id, created_by_user_id, author_name, text, is_deleted, deleted_at, created_at`,
      [uuidv4(), requestId, auth.userId, actor.name, text],
    );

    const message = mapMessageRow(result.rows[0]);
    broadcastMessageCreated(message);
    res.status(201).json(message);
  }),
);

app.patch(
  "/api/requests/:requestId/messages/:messageId",
  asyncHandler(async (req, res) => {
    const auth = parseAuthContext(req);
    if (!auth) {
      res.status(401).json({ error: "Missing or invalid auth token" });
      return;
    }
    const validActor = await actorExists(auth);
    if (!validActor) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const requestId = getRouteParam(req.params.requestId);
    const messageId = getRouteParam(req.params.messageId);
    const hasAccess = await canAccessRequest(auth, requestId);
    if (!hasAccess) {
      const requestOwner = await findRequestOwner(requestId);
      if (!requestOwner) {
        res.status(404).json({ error: "Request not found" });
      } else {
        res.status(403).json({ error: "Forbidden" });
      }
      return;
    }

    const text = String(req.body?.text ?? "").trim();
    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const existing = await pool.query<{
      created_by_user_id: string | null;
      is_deleted: boolean;
    }>(
      `SELECT created_by_user_id, is_deleted
       FROM messages
       WHERE id = $1 AND request_id = $2`,
      [messageId, requestId],
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const messageOwnerId = existing.rows[0].created_by_user_id;
    const canEdit = Boolean(messageOwnerId && messageOwnerId === auth.userId);

    if (!canEdit) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (existing.rows[0].is_deleted) {
      res.status(400).json({ error: "Deleted message cannot be edited" });
      return;
    }

    const result = await pool.query<{
      id: string;
      request_id: string;
      created_by_user_id: string | null;
      author_name: string;
      text: string;
      is_deleted: boolean;
      deleted_at: Date | string | null;
      created_at: Date | string;
    }>(
      `UPDATE messages
       SET text = $1
       WHERE id = $2 AND request_id = $3
       RETURNING id, request_id, created_by_user_id, author_name, text, is_deleted, deleted_at, created_at`,
      [text, messageId, requestId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const message = mapMessageRow(result.rows[0]);
    res.json(message);
  }),
);

app.delete(
  "/api/requests/:requestId/messages/:messageId",
  asyncHandler(async (req, res) => {
    const auth = parseAuthContext(req);
    if (!auth) {
      res.status(401).json({ error: "Missing or invalid auth token" });
      return;
    }
    const validActor = await actorExists(auth);
    if (!validActor) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const requestId = getRouteParam(req.params.requestId);
    const messageId = getRouteParam(req.params.messageId);
    const hasAccess = await canAccessRequest(auth, requestId);
    if (!hasAccess) {
      const requestOwner = await findRequestOwner(requestId);
      if (!requestOwner) {
        res.status(404).json({ error: "Request not found" });
      } else {
        res.status(403).json({ error: "Forbidden" });
      }
      return;
    }

    const existing = await pool.query<{
      created_by_user_id: string | null;
      is_deleted: boolean;
    }>(
      `SELECT created_by_user_id, is_deleted
       FROM messages
       WHERE id = $1 AND request_id = $2`,
      [messageId, requestId],
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const messageOwnerId = existing.rows[0].created_by_user_id;
    const canDelete = Boolean(messageOwnerId && messageOwnerId === auth.userId);

    if (!canDelete) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const result = await pool.query<{
      id: string;
      request_id: string;
      created_by_user_id: string | null;
      author_name: string;
      text: string;
      is_deleted: boolean;
      deleted_at: Date | string | null;
      created_at: Date | string;
    }>(
      `UPDATE messages
       SET text = $1, is_deleted = TRUE, deleted_at = NOW()
       WHERE id = $2 AND request_id = $3
       RETURNING id, request_id, created_by_user_id, author_name, text, is_deleted, deleted_at, created_at`,
      ["Сообщение удалено пользователем", messageId, requestId],
    );

    res.json(mapMessageRow(result.rows[0]));
  }),
);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  },
);

async function start(): Promise<void> {
  await seedDataIfNeeded();

  const server = httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server started at http://localhost:${port}`);
  });

  const shutdown = async () => {
    server.close();
    wss.close();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error);
  process.exit(1);
});
