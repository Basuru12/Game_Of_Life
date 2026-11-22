export type SkillId =
  | "strength"
  | "recovery"
  | "discipline"
  | "intelligence"
  | "systemsThinking"
  | "strategy"
  | "networking"
  | "income"
  | "autonomy";

export type LifeAreaId =
  | "romance"
  | "family"
  | "friends"
  | "growth"
  | "money"
  | "mission"
  | "body"
  | "mind"
  | "soul";

export type QuestTypeId =
  | "fun"
  | "adventure"
  | "courage"
  | "freedom"
  | "master"
  | "legacy";

export type CategoryId = QuestTypeId | LifeAreaId | string;

export interface SkillDef {
  id: SkillId;
  label: string;
  hint: string;
}

export interface CategoryDef {
  id: string;
  label: string;
  color: string;
}

export interface Avatar {
  name: string;
  look: string;
  lifetimeXp: number;
  level: number;
  xp: number;
  skills: Record<string, number>;
}

export type StepKind = "level" | "boss";

export interface QuestStep {
  id: string;
  kind: StepKind;
  title: string;
  xp: number;
}

export interface Quest {
  id: string;
  category: string;
  title: string;
  description: string;
  reward: string;
  rewardClaimed: boolean;
  systematic: boolean;
  custom: boolean;
  steps: QuestStep[];
}

export interface WheelEntry {
  score: number;
  reason: string;
  improvements: string;
}

export type WheelScores = Record<string, WheelEntry>;

export type DoneQuestsMap = Record<string, boolean>;

export interface StepDraft {
  title: string;
  xp: number;
  boss: boolean;
}
