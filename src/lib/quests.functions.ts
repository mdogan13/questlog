import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createQuestSchema, updateQuestSchema, setQuestTrackedSchema, questDoneAfterObjectiveChange, type Quest } from "./quest-rules";

async function db() {
  const { getDb } = await import("./db.server");
  return getDb();
}

export const listQuests = createServerFn({ method: "GET" }).handler(async (): Promise<Quest[]> => {
  const d = await db();
  const quests = d.prepare("SELECT * FROM quests ORDER BY created_at ASC, id ASC").all() as any[];
  const objs = d.prepare("SELECT * FROM objectives ORDER BY position ASC").all() as any[];
  return quests.map((q) => ({
    id: Number(q.id),
    name: q.name,
    type: q.type,
    description: q.description,
    location: q.location,
    done: !!q.done,
    tracked: !!q.tracked,
    createdAt: q.created_at,
    objectives: objs
      .filter((o) => o.quest_id === q.id)
      .map((o) => ({ id: Number(o.id), text: o.text, done: !!o.done })),
  }));
});

export const createQuest = createServerFn({ method: "POST" })
  .inputValidator((data) => createQuestSchema.parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    const r = d
      .prepare("INSERT INTO quests (name, type, description, location) VALUES (?, ?, ?, ?)")
      .run(data.name, data.type, data.description, data.location);
    const id = Number(r.lastInsertRowid);
    const ins = d.prepare("INSERT INTO objectives (quest_id, text, position) VALUES (?, ?, ?)");
    data.objectives.forEach((t, i) => ins.run(id, t, i));
    return { id };
  });

export const toggleObjective = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ objectiveId: z.number().int(), done: z.boolean() }).parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    const obj = d.prepare("SELECT quest_id FROM objectives WHERE id = ?").get(data.objectiveId) as any;
    if (!obj) throw new Error("Objective not found");
    d.prepare("UPDATE objectives SET done = ? WHERE id = ?").run(data.done ? 1 : 0, data.objectiveId);
    const q = d.prepare("SELECT done FROM quests WHERE id = ?").get(obj.quest_id) as any;
    const all = d.prepare("SELECT done FROM objectives WHERE quest_id = ?").all(obj.quest_id) as any[];
    const done = questDoneAfterObjectiveChange(all.map((o) => ({ done: !!o.done })), !!q.done);
    d.prepare("UPDATE quests SET done = ?, tracked = CASE WHEN ? THEN 0 ELSE tracked END WHERE id = ?")
      .run(done ? 1 : 0, done ? 1 : 0, obj.quest_id);
    return { questDone: done };
  });

export const setQuestDone = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ questId: z.number().int(), done: z.boolean() }).parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    d.prepare("UPDATE quests SET done = ?, tracked = CASE WHEN ? THEN 0 ELSE tracked END WHERE id = ?")
      .run(data.done ? 1 : 0, data.done ? 1 : 0, data.questId);
    if (data.done) d.prepare("UPDATE objectives SET done = 1 WHERE quest_id = ?").run(data.questId);
    return { ok: true };
  });

export const deleteQuest = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ questId: z.number().int() }).parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    d.prepare("DELETE FROM objectives WHERE quest_id = ?").run(data.questId);
    d.prepare("DELETE FROM quests WHERE id = ?").run(data.questId);
    return { ok: true };
  });

export const setQuestTracked = createServerFn({ method: "POST" })
  .inputValidator((data) => setQuestTrackedSchema.parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    const result = d.prepare("UPDATE quests SET tracked = ? WHERE id = ? AND (done = 0 OR ? = 0)")
      .run(data.tracked ? 1 : 0, data.questId, data.tracked ? 1 : 0);
    if (Number(result.changes) === 0) {
      if (!d.prepare("SELECT id FROM quests WHERE id = ?").get(data.questId)) throw new Error("Quest not found");
      throw new Error("Completed quests cannot be tracked");
    }
    return { tracked: data.tracked };
  });

export const updateQuest = createServerFn({ method: "POST" })
  .inputValidator((data) => updateQuestSchema.parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    const q = d.prepare("SELECT done FROM quests WHERE id = ?").get(data.id) as any;
    if (!q) throw new Error("Quest not found");
    d.prepare("UPDATE quests SET name = ?, type = ?, description = ?, location = ? WHERE id = ?").run(
      data.name, data.type, data.description, data.location, data.id,
    );
    const existing = d.prepare("SELECT id FROM objectives WHERE quest_id = ?").all(data.id) as any[];
    const keep = new Set(data.objectives.map((o) => o.id).filter((x) => x !== undefined));
    for (const e of existing) if (!keep.has(Number(e.id))) d.prepare("DELETE FROM objectives WHERE id = ?").run(e.id);
    data.objectives.forEach((o, i) => {
      if (o.id !== undefined)
        d.prepare("UPDATE objectives SET text = ?, position = ? WHERE id = ? AND quest_id = ?").run(o.text, i, o.id, data.id);
      else d.prepare("INSERT INTO objectives (quest_id, text, position) VALUES (?, ?, ?)").run(data.id, o.text, i);
    });
    const all = d.prepare("SELECT done FROM objectives WHERE quest_id = ?").all(data.id) as any[];
    const done = questDoneAfterObjectiveChange(all.map((o) => ({ done: !!o.done })), !!q.done);
    d.prepare("UPDATE quests SET done = ?, tracked = CASE WHEN ? THEN 0 ELSE tracked END WHERE id = ?")
      .run(done ? 1 : 0, done ? 1 : 0, data.id);
    return { ok: true };
  });
