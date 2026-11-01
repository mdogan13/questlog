// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";

const directories: string[] = [];
const connections: DatabaseSync[] = [];

afterEach(() => {
  connections.forEach((connection) => connection.close());
  connections.length = 0;
  directories.forEach((directory) => rmSync(directory, { recursive: true, force: true }));
  directories.length = 0;
  vi.unstubAllEnvs();
  vi.resetModules();
});

function databasePath() {
  const directory = mkdtempSync(join(tmpdir(), "questlog-migration-"));
  directories.push(directory);
  const file = join(directory, "quests.db");
  vi.stubEnv("DATABASE_PATH", file);
  return file;
}

describe("quest tracking persistence", () => {
  it("adds tracking to existing journals and preserves quests and objectives", async () => {
    const file = databasePath();
    const legacy = new DatabaseSync(file);
    legacy.exec(`
      CREATE TABLE quests (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
        done INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE objectives (
        id INTEGER PRIMARY KEY, quest_id INTEGER NOT NULL REFERENCES quests(id),
        text TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL
      );
      INSERT INTO quests (id, name, type, done) VALUES (1, 'Existing quest', 'main', 1);
      INSERT INTO objectives (id, quest_id, text, done, position) VALUES (1, 1, 'Existing objective', 1, 0);
    `);
    legacy.close();

    const { getDb } = await import("@/lib/db.server");
    const db = getDb();
    connections.push(db);
    expect(db.prepare("SELECT name, done, tracked FROM quests WHERE id = 1").get()).toEqual({
      name: "Existing quest",
      done: 1,
      tracked: 0,
    });
    expect(db.prepare("SELECT text, done FROM objectives WHERE id = 1").get()).toEqual({
      text: "Existing objective",
      done: 1,
    });
    db.prepare("UPDATE quests SET tracked = 1 WHERE id = 1").run();
    db.prepare("INSERT INTO quests (id, name, type, tracked) VALUES (2, 'Active tracked quest', 'side', 1)").run();
    db.close();
    connections.length = 0;
    vi.resetModules();

    const reopened = (await import("@/lib/db.server")).getDb();
    connections.push(reopened);
    expect(reopened.prepare("SELECT tracked FROM quests WHERE id = 1").get()?.["tracked"]).toBe(0);
    expect(reopened.prepare("SELECT tracked FROM quests WHERE id = 2").get()?.["tracked"]).toBe(1);
  });

  it("starts new quests untracked and restricts tracking to booleans", async () => {
    databasePath();
    const db = (await import("@/lib/db.server")).getDb();
    connections.push(db);
    db.prepare("INSERT INTO quests (name, type) VALUES (?, ?)").run("New quest", "side");
    expect(db.prepare("SELECT tracked FROM quests").get()?.["tracked"]).toBe(0);
    expect(() => db.exec("UPDATE quests SET tracked = 2")).toThrow();
  });
});
