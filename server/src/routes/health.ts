/** Проверка живости сервера и подключения к PostgreSQL. */
import { Router } from "express";
import { pool } from "../db";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  }),
);

export default router;
