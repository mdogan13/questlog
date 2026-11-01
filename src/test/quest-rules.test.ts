import { describe, expect, it } from "vitest";
import {
  createQuestSchema,
  questDoneAfterObjectiveChange,
  setQuestTrackedSchema,
  trackedQuestsFirst,
} from "@/lib/quest-rules";

describe("quest rules", () => {
  it("quest is done when all objectives are done", () => {
    expect(questDoneAfterObjectiveChange([{ done: true }, { done: true }], false)).toBe(true);
  });
  it("quest is not done while an objective is open", () => {
    expect(questDoneAfterObjectiveChange([{ done: true }, { done: false }], false)).toBe(false);
  });
  it("only name is required; type must be main or side", () => {
    expect(createQuestSchema.parse({ name: "Find Ciri", type: "main" }).objectives).toEqual([]);
    expect(() => createQuestSchema.parse({ name: "", type: "main" })).toThrow();
    expect(() => createQuestSchema.parse({ name: "x", type: "epic" })).toThrow();
  });

  it("pins multiple tracked quests without changing order or mutating the source", () => {
    const quests = [
      { id: 1, tracked: false },
      { id: 2, tracked: true },
      { id: 3, tracked: false },
      { id: 4, tracked: true },
    ];
    expect(trackedQuestsFirst(quests).map((quest) => quest.id)).toEqual([2, 4, 1, 3]);
    expect(quests.map((quest) => quest.id)).toEqual([1, 2, 3, 4]);
    expect(trackedQuestsFirst([])).toEqual([]);
  });

  it("restores a quest's original position when it is untracked", () => {
    const quests = [
      { id: 1, tracked: false },
      { id: 2, tracked: false },
      { id: 3, tracked: true },
    ];
    expect(trackedQuestsFirst(quests).map((quest) => quest.id)).toEqual([3, 1, 2]);
    quests[2]!.tracked = false;
    expect(trackedQuestsFirst(quests).map((quest) => quest.id)).toEqual([1, 2, 3]);
  });

  it("validates tracking changes without coercing values", () => {
    expect(setQuestTrackedSchema.parse({ questId: 1, tracked: false })).toEqual({
      questId: 1,
      tracked: false,
    });
    expect(() => setQuestTrackedSchema.parse({ questId: 0, tracked: true })).toThrow();
    expect(() => setQuestTrackedSchema.parse({ questId: 1, tracked: "false" })).toThrow();
  });
});
