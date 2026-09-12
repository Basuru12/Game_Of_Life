// --- Shared settings ---
const POINTS_TOTAL = 30;
const BASE = 1;
const LOOKS = ["🙂", "😎", "🧑", "🧙", "🦊", "🌱"];
const AVATAR_STORAGE_KEY = "lifeRpgAvatar";
const QUEST_DONE_KEY = "lifeRpgQuestDone";

const SKILLS = [
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

function makeStartingSkills() {
  const skills = {};
  SKILLS.forEach((skill) => {
    skills[skill.id] = BASE;
  });
  return skills;
}

function makeNewAvatar() {
  return {
    name: "",
    look: LOOKS[0],
    level: 1,
    xp: 0,
    skills: makeStartingSkills(),
  };
}

// --- Level / XP ---
function xpToNextLevel(level) {
  return level * 100;
}

function gainXp(avatar, amount) {
  avatar.xp += amount;

  while (avatar.xp >= xpToNextLevel(avatar.level)) {
    avatar.xp -= xpToNextLevel(avatar.level);
    avatar.level += 1;
  }
}

// --- Save / load ---
function saveAvatar(avatar) {
  localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(avatar));
}

function loadAvatar() {
  const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function clearDoneQuests() {
  localStorage.removeItem(QUEST_DONE_KEY);
}
