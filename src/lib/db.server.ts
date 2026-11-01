import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

let db: DatabaseSync | null = null;

export function getDb() {
  const file = resolve(process.env['DATABASE_PATH'] ?? "./data/quests.db");
  if (db && existsSync(file)) return db;
  mkdirSync(dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('main','side')),
      description TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      done INTEGER NOT NULL DEFAULT 0,
      tracked INTEGER NOT NULL DEFAULT 0 CHECK (tracked IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS objectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quest_id INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL
    );
  `);
  // Upgrade existing journals without replacing their quests or objectives.
  const columns = db.prepare("PRAGMA table_info(quests)").all();
  if (!columns.some((column) => column['name'] === "tracked")) {
    db.exec("ALTER TABLE quests ADD COLUMN tracked INTEGER NOT NULL DEFAULT 0 CHECK (tracked IN (0, 1))");
  }
  // Clear tracking left on completed quests by older app versions.
  db.exec("UPDATE quests SET tracked = 0 WHERE done = 1 AND tracked != 0");
  return db;
}
