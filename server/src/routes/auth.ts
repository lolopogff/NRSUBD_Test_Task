/** Регистрация и вход. После успеха клиент получает JWT + профиль пользователя. */
import { Router } from "express";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../utils/asyncHandler";
import { signAuthToken } from "../services/auth";
import {
  createUser,
  findUserByUsername,
  toPublicUser,
} from "../services/users";
import { UserRole } from "../types";

const router = Router();

router.post(
  "/register",
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

    const user = await createUser({ name, username, password, role });
    const token = signAuthToken({ userId: user.id, role: user.role });
    res.status(201).json({ user, token });
  }),
);

router.post(
  "/login",
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

export default router;
