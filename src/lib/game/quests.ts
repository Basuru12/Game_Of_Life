import { getSession } from "../auth";
import { supabase } from "../supabase";
import type { Quest, QuestStep } from "./types";

interface QuestRow {
  id: string;
  user_id: string;
  category: string;
  title: string;
  description: string;
  reward: string;
  reward_claimed: boolean;
  systematic: boolean;
  steps: QuestStep[];
  updated_at: string;
}

function questToRow(quest: Quest, userId: string): QuestRow {
  return {
    id: quest.id,
    user_id: userId,
    category: quest.category,
    title: quest.title,
    description: quest.description || "",
    reward: quest.reward || "",
    reward_claimed: Boolean(quest.rewardClaimed),
    systematic: Boolean(quest.systematic),
    steps: quest.steps || [],
    updated_at: new Date().toISOString(),
  };
}

function rowToQuest(row: {
  id: string;
  category: string;
  title: string;
  description?: string | null;
  reward?: string;
  reward_claimed: boolean ;
  systematic: boolean ;
  steps?: QuestStep[] | null;
}): Quest {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description || "",
    reward: row.reward || "",
    rewardClaimed: Boolean(row.reward_claimed),
    systematic: Boolean(row.systematic),
    custom: true,
    steps: Array.isArray(row.steps) ? row.steps : [],
  };
}

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session.user.id;
}

export async function loadQuestPaths(): Promise<Quest[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("quest_paths")
    .select(
      "id, category, title, description, reward, reward_claimed, systematic, steps"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: true });

  if (error) throw error;
  return (data ).map(rowToQuest);
}

export async function saveQuestPath(quest: Quest): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("quest_paths")
    .upsert(questToRow(quest, userId));

  if (error) throw error;
}

export async function deleteQuestPath(questId: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("quest_paths")
    .delete()
    .eq("user_id", userId)
    .eq("id", questId);

  if (error) throw error;
}
