import { z } from "zod";

export const questTypeSchema = z.enum(["main", "side"]);
export type QuestType = z.infer<typeof questTypeSchema>;

export const createQuestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  type: questTypeSchema,
  description: z.string().trim().max(4000).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),
  objectives: z.array(z.string().trim().min(1).max(300)).max(50).optional().default([]),
});
export type CreateQuestInput = z.input<typeof createQuestSchema>;

export type Objective = { id: number; text: string; done: boolean };
export type Quest = {
  id: number;
  name: string;
  type: QuestType;
  description: string;
  location: string;
  done: boolean;
  tracked: boolean;
  createdAt: string;
  objectives: Objective[];
};

export const setQuestTrackedSchema = z.object({
  questId: z.number().int().positive(),
  tracked: z.boolean(),
});

/** Pin tracked quests while preserving the existing order within each group. */
export function trackedQuestsFirst<T extends { tracked: boolean }>(quests: readonly T[]): T[] {
  return [...quests.filter((quest) => quest.tracked), ...quests.filter((quest) => !quest.tracked)];
}

/** A quest with objectives is done exactly when all its objectives are done. */
export function questDoneAfterObjectiveChange(objectives: { done: boolean }[], wasDone: boolean) {
  if (objectives.length === 0) return wasDone;
  return objectives.every((o) => o.done);
}

export const updateQuestSchema = z.object({
  id: z.number().int(),
  name: z.string().trim().min(1, "Name is required").max(120),
  type: questTypeSchema,
  description: z.string().trim().max(4000).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),
  objectives: z
    .array(z.object({ id: z.number().int().optional(), text: z.string().trim().min(1).max(300) }))
    .max(50)
    .optional()
    .default([]),
});
export type UpdateQuestInput = z.input<typeof updateQuestSchema>;
