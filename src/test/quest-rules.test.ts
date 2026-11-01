import { describe, expect, it } from "vitest";
import { createQuestSchema, questDoneAfterObjectiveChange } from "@/lib/quest-rules";

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
});
