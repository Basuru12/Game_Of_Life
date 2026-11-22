import { getSession } from "../auth";
import { supabase } from "../supabase";
import {
  LOOKS,
  applyLifetimeXp,
  makeStartingSkills,
} from "./constants";
import type { Avatar, WheelScores } from "./types";

export async function saveAvatar(avatar: Avatar): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new Error("Not signed in.");
  }

  const { error } = await supabase.from("profiles").upsert({
    id: session.user.id,
    name: avatar.name,
    look: avatar.look,
    lifetime_xp: Number(avatar.lifetimeXp),
    skills: avatar.skills,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function loadAvatar(): Promise<Avatar | null> {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("name, look, lifetime_xp, skills")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.name) return null;

  const avatar: Avatar = {
    name: data.name,
    look: data.look || LOOKS[0],
    lifetimeXp: Number(data.lifetime_xp) || 0,
    level: 1,
    xp: 0,
    skills:
      data.skills && typeof data.skills === "object"
        ? (data.skills as Record<string, number>)
        : makeStartingSkills(),
  };
  applyLifetimeXp(avatar);

  return avatar;
}

export async function getAppHomePath(): Promise<"/quests" | "/create"> {
  const avatar = await loadAvatar();
  return avatar && avatar.name ? "/quests" : "/create";
}

export async function loadWheelScores(): Promise<Record<string, unknown>> {
  const session = await getSession();
  if (!session) return {};

  const { data, error } = await supabase
    .from("profiles")
    .select("wheel")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.wheel || typeof data.wheel !== "object") return {};
  return data.wheel as Record<string, unknown>;
}

export async function saveWheelScores(scores: WheelScores): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new Error("Not signed in.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      wheel: scores,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.user.id);

  if (error) throw error;
}
