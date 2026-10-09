// --- Shared settings ---
const POINTS_TOTAL = 30;
const BASE = 1;
const LOOKS = ["🙂", "😎", "🧑", "🧙", "🦊", "🌱"];
const AVATAR_STORAGE_KEY = "lifeRpgAvatar";
const CUSTOM_QUESTS_KEY = "lifeRpgCustomQuests";
const QUEST_DONE_KEY = "lifeRpgQuestDone";

// Wheel of Life segments — also used as quest categories
const LIFE_AREAS = [
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
// Budget: ~100 full paths (~340 XP each) ≈ 34k XP to reach level 50.
// Early levels are cheap; later levels cost more (linear ramp).
const MAX_LEVEL = 50;
const FULL_PATH_XP = 340;
const PATHS_TO_MAX = 100;

function xpToNextLevel(level) {
  // Level 1→2: 120 XP; each next level +24. Totals ~34,104 XP ≈ 100 paths.
  return 120 + (level - 1) * 24;
}

function gainXp(avatar, amount) {
  if (avatar.level >= MAX_LEVEL) {
    avatar.level = MAX_LEVEL;
    avatar.xp = 0;
    return;
  }

  avatar.xp += amount;

  while (
    avatar.level < MAX_LEVEL &&
    avatar.xp >= xpToNextLevel(avatar.level)
  ) {
    avatar.xp -= xpToNextLevel(avatar.level);
    avatar.level += 1;
  }

  if (avatar.level >= MAX_LEVEL) {
    avatar.level = MAX_LEVEL;
    avatar.xp = 0;
  }
}

// --- Save / load (Supabase profiles) ---
async function saveAvatar(avatar) {
  const session = await getSession();
  if (!session) {
    throw new Error("Not signed in.");
  }

  const { error } = await supabaseClient.from("profiles").upsert({
    id: session.user.id,
    name: avatar.name,
    look: avatar.look,
    level: avatar.level,
    xp: avatar.xp,
    skills: avatar.skills,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

async function loadAvatar() {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("name, look, level, xp, skills")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.name) return null;

  return {
    name: data.name,
    look: data.look || LOOKS[0],
    level: data.level || 1,
    xp: data.xp || 0,
    skills:
      data.skills && typeof data.skills === "object"
        ? data.skills
        : makeStartingSkills(),
  };
}

async function redirectToAppHome() {
  const avatar = await loadAvatar();
  location.href = avatar && avatar.name ? "quests.html" : "index.html";
}

async function loadWheelScores() {
  const session = await getSession();
  if (!session) return {};

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("wheel")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.wheel || typeof data.wheel !== "object") return {};
  return data.wheel;
}

async function saveWheelScores(scores) {
  const session = await getSession();
  if (!session) {
    throw new Error("Not signed in.");
  }

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      wheel: scores,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.user.id);

  if (error) throw error;
}

function questToRow(quest, userId) {
  return {
    id: quest.id,
    user_id: userId,
    category: quest.category,
    title: quest.title,
    description: quest.description || "",
    reward: quest.reward || "",
    reward_claimed: Boolean(quest.rewardClaimed),
    steps: quest.steps || [],
    updated_at: new Date().toISOString(),
  };
}

function rowToQuest(row) {
  if (!row) return null;
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description || "",
    reward: row.reward || "",
    rewardClaimed: Boolean(row.reward_claimed),
    custom: true,
    steps: Array.isArray(row.steps) ? row.steps : [],
  };
}

async function requireUserId() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session.user.id;
}

async function loadQuestPaths() {
  const userId = await requireUserId();
  const { data, error } = await supabaseClient
    .from("quest_paths")
    .select("id, category, title, description, reward, reward_claimed, steps")
    .eq("user_id", userId)
    .order("updated_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(rowToQuest).filter(Boolean);
}

async function saveQuestPath(quest) {
  const userId = await requireUserId();
  const { error } = await supabaseClient
    .from("quest_paths")
    .upsert(questToRow(quest, userId));

  if (error) throw error;
}

async function deleteQuestPath(questId) {
  const userId = await requireUserId();
  const { error } = await supabaseClient
    .from("quest_paths")
    .delete()
    .eq("user_id", userId)
    .eq("id", questId);

  if (error) throw error;
}

async function loadDoneQuests() {
  const userId = await requireUserId();
  const { data, error } = await supabaseClient
    .from("step_completions")
    .select("path_id, step_id")
    .eq("user_id", userId);

  if (error) throw error;

  const done = {};
  (data || []).forEach((row) => {
    done[row.path_id + "::" + row.step_id] = true;
  });
  return done;
}

async function markStepComplete(pathId, stepId) {
  const userId = await requireUserId();
  const { error } = await supabaseClient.from("step_completions").upsert({
    user_id: userId,
    path_id: pathId,
    step_id: stepId,
    completed_at: new Date().toISOString(),
  });

  if (error) throw error;
}

async function deleteStepCompletionsForPath(pathId) {
  const userId = await requireUserId();
  const { error } = await supabaseClient
    .from("step_completions")
    .delete()
    .eq("user_id", userId)
    .eq("path_id", pathId);

  if (error) throw error;
}

async function clearDoneQuests() {
  const userId = await requireUserId();
  const { error } = await supabaseClient
    .from("step_completions")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
  localStorage.removeItem(QUEST_DONE_KEY);
}

function readLocalCustomQuests() {
  const raw = localStorage.getItem(CUSTOM_QUESTS_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    return [];
  }
}

function readLocalDoneQuests() {
  const raw = localStorage.getItem(QUEST_DONE_KEY);
  if (!raw) return {};
  try {
    const done = JSON.parse(raw);
    return done && typeof done === "object" ? done : {};
  } catch (error) {
    return {};
  }
}

function readLocalAvatar() {
  const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
  if (!raw) return null;
  try {
    const avatar = JSON.parse(raw);
    if (!avatar || typeof avatar !== "object" || !avatar.name) return null;
    return avatar;
  } catch (error) {
    return null;
  }
}

// One-time: copy localStorage into Supabase when the cloud account is still empty.
async function migrateLocalStorageIfNeeded() {
  const userId = await requireUserId();

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw profileError;

  if (!profile || !profile.name) {
    const localAvatar = readLocalAvatar();
    if (localAvatar) {
      await saveAvatar({
        name: localAvatar.name,
        look: localAvatar.look || LOOKS[0],
        level: localAvatar.level || 1,
        xp: localAvatar.xp || 0,
        skills:
          localAvatar.skills && typeof localAvatar.skills === "object"
            ? localAvatar.skills
            : makeStartingSkills(),
      });
    }
  }

  const { data: existingPaths, error: pathsError } = await supabaseClient
    .from("quest_paths")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (pathsError) throw pathsError;

  if (!existingPaths || existingPaths.length === 0) {
    const localQuests = readLocalCustomQuests();
    if (localQuests.length > 0) {
      const rows = localQuests
        .filter((quest) => quest && quest.id)
        .map((quest) =>
          questToRow(
            {
              id: quest.id,
              category: quest.category,
              title: quest.title,
              description: quest.description || "",
              reward: quest.reward || "",
              rewardClaimed: Boolean(quest.rewardClaimed),
              steps: Array.isArray(quest.steps) ? quest.steps : [],
            },
            userId
          )
        );

      if (rows.length > 0) {
        const { error } = await supabaseClient.from("quest_paths").upsert(rows);
        if (error) throw error;
      }
    }
  }

  const { data: existingDone, error: doneError } = await supabaseClient
    .from("step_completions")
    .select("path_id")
    .eq("user_id", userId)
    .limit(1);
  if (doneError) throw doneError;

  if (!existingDone || existingDone.length === 0) {
    const localDone = readLocalDoneQuests();
    const rows = Object.keys(localDone)
      .filter((key) => localDone[key] && key.indexOf("::") > 0)
      .map((key) => {
        const parts = key.split("::");
        return {
          user_id: userId,
          path_id: parts[0],
          step_id: parts.slice(1).join("::"),
          completed_at: new Date().toISOString(),
        };
      });

    if (rows.length > 0) {
      const { error } = await supabaseClient
        .from("step_completions")
        .upsert(rows);
      if (error) throw error;
    }
  }

  localStorage.removeItem(AVATAR_STORAGE_KEY);
  localStorage.removeItem(CUSTOM_QUESTS_KEY);
  localStorage.removeItem(QUEST_DONE_KEY);
}
