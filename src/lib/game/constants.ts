import type { Avatar, CategoryDef, SkillDef } from "./types";

export const POINTS_TOTAL = 30;
export const BASE = 1;
export const LOOKS = ["🙂", "😎", "🧑", "🧙", "🦊", "🌱"] as const;

export const LIFE_AREAS: CategoryDef[] = [
  { id: "romance", label: "Romance", color: "#c44b4b" },
  { id: "family", label: "Family", color: "#c45a9a" },
  { id: "friends", label: "Friends", color: "#6aa8c9" },
  { id: "growth", label: "Growth", color: "#d4653a" },
  { id: "money", label: "Money", color: "#4caf50" },
  { id: "mission", label: "Mission", color: "#2f5f9a" },
  { id: "body", label: "Body", color: "#c47a3a" },
  { id: "mind", label: "Mind", color: "#d4b83a" },
  { id: "soul", label: "Soul", color: "#e0a878" },
];

export const SKILLS: SkillDef[] = [
  {
    id: "strength",
    label: "Strength",
    hint: "Gym sessions, progressive overload, nutrition",
  },
  {
    id: "recovery",
    label: "Recovery",
    hint: "Sleep, rest, meditation, low-stimulation hobbies",
  },
  {
    id: "discipline",
    label: "Discipline",
    hint: "Completing planned actions despite resistance",
  },
  {
    id: "intelligence",
    label: "Intelligence",
    hint: "Books, technical study, deliberate practice",
  },
  {
    id: "systemsThinking",
    label: "Systems Thinking",
    hint: "Diagrams, models, post-mortems",
  },
  {
    id: "strategy",
    label: "Strategy",
    hint: "Chess, planning, decision reviews",
  },
  {
    id: "networking",
    label: "Networking",
    hint: "Meaningful conversations, helping others, follow-ups",
  },
  {
    id: "income",
    label: "Income",
    hint: "Earning, saving, building valuable assets",
  },
  {
    id: "autonomy",
    label: "Autonomy",
    hint: "Controlling your time, reducing dependencies",
  },
];

export const MAX_LEVEL = 50;

export const QUEST_TYPE_CATEGORIES: CategoryDef[] = [
  { id: "fun", label: "Fun Quests", color: "#c9a227" },
  { id: "adventure", label: "Adventure Quests", color: "#2a8f7a" },
  { id: "courage", label: "Courage Quests", color: "#b33b3b" },
  { id: "freedom", label: "Freedom Quests", color: "#6b5b95" },
  { id: "master", label: "Master Quests", color: "#8b6914" },
  { id: "legacy", label: "Legacy Quests", color: "#5c6b7a" },
];

export const CATEGORIES: CategoryDef[] = QUEST_TYPE_CATEGORIES.concat(LIFE_AREAS);

/**
 * Looks up a category definition by id from CATEGORIES.
 * @param id - Category id (quest type or life area).
 * @returns The matching CategoryDef, or undefined if not found.
 */
export function getCategory(id: string): CategoryDef | undefined {
  return CATEGORIES.find((category) => category.id === id);
}

export const MAX_STEP_XP = 120;

export const WHEEL_DEFAULT_SCORE = 5;
export const WHEEL_MIN = 1;
export const WHEEL_MAX = 10;

export function makeStartingSkills(): Record<string, number> {
  const skills: Record<string, number> = {};
  SKILLS.forEach((skill) => {
    skills[skill.id] = BASE;
  });
  return skills;
}

export function makeNewAvatar(): Avatar {
  const avatar: Avatar = {
    name: "",
    look: LOOKS[0],
    lifetimeXp: 0,
    level: 1,
    xp: 0,
    skills: makeStartingSkills(),
  };
  applyLifetimeXp(avatar);
  return avatar;
}

export function xpToNextLevel(level: number): number {
  return 120 + (level - 1) * 24;
}

export function applyLifetimeXp(avatar: Avatar): void {
  let remaining = Number(avatar.lifetimeXp);
  avatar.lifetimeXp = remaining;
  avatar.level = 1;
  avatar.xp = 0;

  while (avatar.level < MAX_LEVEL && remaining >= xpToNextLevel(avatar.level)) {
    remaining -= xpToNextLevel(avatar.level);
    avatar.level += 1;
  }

  if (avatar.level >= MAX_LEVEL) {
    avatar.level = MAX_LEVEL;
    avatar.xp = 0;
    return;
  }

  avatar.xp = remaining;
}

export function gainXp(avatar: Avatar, amount: number): void {
  const delta = Number(amount);
  avatar.lifetimeXp = Number(avatar.lifetimeXp) + delta;
  applyLifetimeXp(avatar);
}
