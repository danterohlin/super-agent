import Database from "better-sqlite3";
import type { Config } from "./config.js";

export type MessageRole = "user" | "assistant";

export function openDb(config: Config): Database.Database {
  const db = new Database(config.DATABASE_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages (chat_id, id);

    CREATE TABLE IF NOT EXISTS memory_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export function insertMessage(
  db: Database.Database,
  chatId: number,
  role: MessageRole,
  content: string,
): void {
  db.prepare(
    `INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)`,
  ).run(chatId, role, content);
}

export function recentMessages(
  db: Database.Database,
  chatId: number,
  limit: number,
): { role: MessageRole; content: string }[] {
  const rows = db
    .prepare(
      `SELECT role, content FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?`,
    )
    .all(chatId, limit) as { role: MessageRole; content: string }[];
  return rows.reverse();
}

export function memoryGet(db: Database.Database, key: string): string | null {
  const row = db
    .prepare(`SELECT value FROM memory_kv WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function memorySet(db: Database.Database, key: string, value: string): void {
  db.prepare(
    `INSERT INTO memory_kv (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, value);
}

export function memoryListKeys(
  db: Database.Database,
  prefix: string,
): string[] {
  const rows = db
    .prepare(`SELECT key FROM memory_kv WHERE key LIKE ? ORDER BY key`)
    .all(`${prefix}%`) as { key: string }[];
  return rows.map((r) => r.key);
}
