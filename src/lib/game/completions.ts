import { getSession } from "../auth";
import { supabase } from "../supabase";
import type { DoneQuestsMap } from "./types";

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session.user.id;
}

export async function loadDoneQuests(): Promise<DoneQuestsMap> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("step_completions")
    .select("path_id, step_id")
    .eq("user_id", userId);

  if (error) throw error;

  const done: DoneQuestsMap = {};
  (data || []).forEach((row) => {
    done[row.path_id + "::" + row.step_id] = true;
  });
  return done;
}

export async function markStepComplete(
  pathId: string,
  stepId: string
): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("step_completions").upsert({
    user_id: userId,
    path_id: pathId,
    step_id: stepId,
    completed_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function deleteStepCompletionsForPath(
  pathId: string
): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("step_completions")
    .delete()
    .eq("user_id", userId)
    .eq("path_id", pathId);

  if (error) throw error;
}

export async function clearDoneQuests(): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("step_completions")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}
