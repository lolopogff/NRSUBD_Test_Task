/** Работа с пользователями: регистрация, поиск. */
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db";
import { User, UserRole, UserRow } from "../types";

export function toPublicUser(row: {
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

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
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

export async function findUserById(userId: string): Promise<User | null> {
  const result = await pool.query<User>(
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

export async function createUser(payload: {
  name: string;
  username: string;
  password: string;
  role: UserRole;
}): Promise<User> {
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(payload.password, 10);

  await pool.query(
    `INSERT INTO users (id, name, role, username, password_hash)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, payload.name, payload.role, payload.username, passwordHash],
  );

  return {
    id: userId,
    name: payload.name,
    username: payload.username,
    role: payload.role,
  };
}
