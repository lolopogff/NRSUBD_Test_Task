/**
 * Сообщения внутри кейса. mergeParams: true — requestId приходит из родительского роута.
 * Редактировать/удалять можно только свои сообщения.
 */
import { Router } from "express";
import {
  ensureRequestAccess,
  ensureRequestExistsOrForbidden,
} from "../middleware/access";
import { requireAuth } from "../middleware/auth";
import {
  createMessage,
  findMessageOwnership,
  listMessages,
  softDeleteMessage,
  updateMessageText,
} from "../services/messages";
import { findUserById } from "../services/users";
import { broadcastMessageCreated } from "../websocket/hub";
import { asyncHandler } from "../utils/asyncHandler";
import { getRouteParam } from "../utils/routeParams";

const router = Router({ mergeParams: true });

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const requestId = getRouteParam(req.params.requestId);

    if (!(await ensureRequestAccess(auth, requestId, res))) {
      return;
    }

    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 100)));
    const beforeRaw = req.query.before ? String(req.query.before) : null;
    const messages = await listMessages(requestId, limit, beforeRaw);

    res.json(messages);
  }),
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const requestId = getRouteParam(req.params.requestId);

    if (!(await ensureRequestExistsOrForbidden(auth, requestId, res))) {
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

    const message = await createMessage({
      requestId,
      authorId: auth.userId,
      authorName: actor.name,
      text,
    });

    broadcastMessageCreated(message);
    res.status(201).json(message);
  }),
);

router.patch(
  "/:messageId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const requestId = getRouteParam(req.params.requestId);
    const messageId = getRouteParam(req.params.messageId);

    if (!(await ensureRequestExistsOrForbidden(auth, requestId, res))) {
      return;
    }

    const text = String(req.body?.text ?? "").trim();
    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const existing = await findMessageOwnership(requestId, messageId);
    if (!existing) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const canEdit = Boolean(
      existing.createdByUserId && existing.createdByUserId === auth.userId,
    );
    if (!canEdit) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (existing.isDeleted) {
      res.status(400).json({ error: "Deleted message cannot be edited" });
      return;
    }

    const message = await updateMessageText(requestId, messageId, text);
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    res.json(message);
  }),
);

router.delete(
  "/:messageId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const requestId = getRouteParam(req.params.requestId);
    const messageId = getRouteParam(req.params.messageId);

    if (!(await ensureRequestExistsOrForbidden(auth, requestId, res))) {
      return;
    }

    const existing = await findMessageOwnership(requestId, messageId);
    if (!existing) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const canDelete = Boolean(
      existing.createdByUserId && existing.createdByUserId === auth.userId,
    );
    if (!canDelete) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const message = await softDeleteMessage(requestId, messageId);
    res.json(message);
  }),
);

export default router;
