import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BASE,
  LOOKS,
  POINTS_TOTAL,
  SKILLS,
  applyLifetimeXp,
  makeNewAvatar,
} from "../lib/game/constants";
import { clearDoneQuests } from "../lib/game/completions";
import { loadAvatar, saveAvatar } from "../lib/game/profiles";
import type { Avatar } from "../lib/game/types";

export function CreateAvatarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceNew = searchParams.get("new") === "1";

  const [avatar, setAvatar] = useState<Avatar>(() => makeNewAvatar());
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(!forceNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (forceNew) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    loadAvatar()
      .then((existing) => {
        if (cancelled) return;
        if (existing && existing.name) {
          navigate("/quests", { replace: true });
          return;
        }
        setChecking(false);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [forceNew, navigate]);

  const pointsSpent = useMemo(() => {
    let spent = 0;
    SKILLS.forEach((skill) => {
      spent += (avatar.skills[skill.id] ?? BASE) - BASE;
    });
    return spent;
  }, [avatar.skills]);

  const pointsLeft = POINTS_TOTAL - pointsSpent;

  function changeSkill(id: string, delta: number) {
    setAvatar((prev) => {
      const current = prev.skills[id] ?? BASE;
      const next = current + delta;
      if (next < BASE) return prev;
      if (delta > 0 && pointsLeft <= 0) return prev;
      return {
        ...prev,
        skills: { ...prev.skills, [id]: next },
      };
    });
  }

  async function beginGame() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a name first.");
      return;
    }

    setError("");
    setSaving(true);

    const next: Avatar = {
      ...avatar,
      name: trimmed,
      lifetimeXp: 0,
    };
    applyLifetimeXp(next);

    try {
      await clearDoneQuests();
      await saveAvatar(next);
      navigate("/quests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save avatar.");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <main className="app">
        <p className="page-intro">Loading…</p>
      </main>
    );
  }

  return (
    <main className="app">
      <h1>Create Your Life Avatar</h1>

      <label className="field">
        <span>Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name"
          maxLength={24}
        />
      </label>

      <section className="field">
        <span>Look</span>
        <div className="look-options">
          {LOOKS.map((look) => (
            <button
              key={look}
              type="button"
              className={"look-btn" + (avatar.look === look ? " selected" : "")}
              aria-label={"Choose look " + look}
              onClick={() => setAvatar((prev) => ({ ...prev, look }))}
            >
              {look}
            </button>
          ))}
        </div>
      </section>

      <p className="points">
        Points left: <strong>{pointsLeft}</strong>
      </p>

      <section className="attributes">
        {SKILLS.map((skill) => {
          const value = avatar.skills[skill.id] ?? BASE;
          return (
            <div key={skill.id} className="attr-row">
              <div className="attr-info">
                <span className="attr-label">{skill.label}</span>
                <span className="attr-hint">{skill.hint}</span>
              </div>
              <div className="attr-controls">
                <button
                  type="button"
                  disabled={value <= BASE}
                  onClick={() => changeSkill(skill.id, -1)}
                >
                  −
                </button>
                <span className="attr-value">{value}</span>
                <button
                  type="button"
                  disabled={pointsLeft <= 0}
                  onClick={() => changeSkill(skill.id, 1)}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <button
        type="button"
        className="create-btn"
        onClick={beginGame}
        disabled={saving}
      >
        Begin
      </button>
      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
