/**
 * CRUD правовых запросов (кейсов).
 * Создавать кейсы может только role=user; менять статус — только specialist.
 */
import { Router } from "express";
import { ensureRequestAccess } from "../middleware/access";
import { requireAuth } from "../middleware/auth";
import {
  createRequest,
  deleteRequest,
  findRequestOwner,
  listRequests,
  updateRequestStatus,
} from "../services/requests";
import { RequestStatus } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import { getRouteParam } from "../utils/routeParams";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const requests = await listRequests(req.auth!);
    res.json(requests);
  }),
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
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

    const legalRequest = await createRequest({
      title,
      description,
      ownerUserId: auth.userId,
    });

    res.status(201).json(legalRequest);
  }),
);

router.patch(
  "/:requestId/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
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

    const updated = await updateRequestStatus(requestId, status);
    if (!updated) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    res.json(updated);
  }),
);

router.delete(
  "/:requestId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
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

    await deleteRequest(requestId);
    res.status(204).send();
  }),
);

export default router;
