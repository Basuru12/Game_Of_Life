import { MAX_STEP_XP } from "./constants";
import type { DoneQuestsMap, Quest, QuestStep, StepDraft } from "./types";

export function stepDoneKey(questId: string, stepId: string): string {
  return questId + "::" + stepId;
}

export function clampStepXp(value: unknown): number {
  let xp = Number(value);
  if (!Number.isFinite(xp) || xp < 1) xp = 30;
  if (xp > MAX_STEP_XP) xp = MAX_STEP_XP;
  return xp;
}

export function normalizeQuest(quest: unknown): Quest | null {
  if (!quest || typeof quest !== "object") return null;

  const q = quest as Partial<Quest> & { xp?: number };
  const reward = typeof q.reward === "string" ? q.reward : "";
  const rewardClaimed = Boolean(q.rewardClaimed);
  const systematic = Boolean(q.systematic);

  if (Array.isArray(q.steps) && q.steps.length > 0) {
    return {
      id: String(q.id),
      category: String(q.category),
      title: String(q.title),
      description: q.description || "",
      reward,
      rewardClaimed,
      systematic,
      custom: Boolean(q.custom),
      steps: q.steps.map((step, index) => ({
        id: step.id || "step-" + (index + 1),
        kind: step.kind === "boss" ? "boss" : "level",
        title: step.title || "",
        xp: clampStepXp(step.xp),
      })),
    };
  }

  return {
    id: String(q.id),
    category: String(q.category),
    title: String(q.title),
    description: q.description || "",
    reward,
    rewardClaimed,
    systematic,
    custom: Boolean(q.custom),
    steps: [
      {
        id: "step-1",
        kind: "level",
        title: q.title || "Step 1",
        xp: clampStepXp(q.xp),
      },
    ],
  };
}

export function isStepDone(
  doneQuests: DoneQuestsMap,
  questId: string,
  stepId: string
): boolean {
  return Boolean(doneQuests[stepDoneKey(questId, stepId)]);
}

export function countDoneSteps(
  doneQuests: DoneQuestsMap,
  quest: Quest
): number {
  let count = 0;
  quest.steps.forEach((step) => {
    if (isStepDone(doneQuests, quest.id, step.id)) count += 1;
  });
  return count;
}

export function isPathComplete(
  doneQuests: DoneQuestsMap,
  quest: Quest
): boolean {
  return (
    quest.steps.length > 0 &&
    countDoneSteps(doneQuests, quest) === quest.steps.length
  );
}

export function shouldHidePath(
  doneQuests: DoneQuestsMap,
  quest: Quest
): boolean {
  if (quest.systematic) return false;
  if (!isPathComplete(doneQuests, quest)) return false;
  if (!quest.reward || quest.rewardClaimed) return true;
  return false;
}

export function stepLabel(step: QuestStep, levelNumber: number): string {
  if (step.kind === "boss") return "BOSS BATTLE";
  return "Level " + levelNumber;
}

export function defaultStepDrafts(): StepDraft[] {
  return [
    { title: "", xp: 100, boss: false },
    { title: "", xp: 20, boss: false },
    { title: "", xp: 20, boss: false },
    { title: "", xp: 50, boss: false },
    { title: "", xp: 50, boss: false },
    { title: "", xp: 100, boss: true },
  ];
}
