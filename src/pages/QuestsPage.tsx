import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  CATEGORIES,
  DEFAULT_CATEGORY_ID,
  MAX_LEVEL,
  SKILLS,
  applyLifetimeXp,
  gainXp,
  getCategory,
  xpToNextLevel,
} from "../lib/game/constants";
import {
  deleteStepCompletionsForPath,
  loadDoneQuests,
  markStepComplete,
} from "../lib/game/completions";
import {
  clampStepXp,
  countDoneSteps,
  defaultStepDrafts,
  isPathComplete,
  isStepDone,
  normalizeQuest,
  shouldHidePath,
  stepDoneKey,
  stepLabel,
} from "../lib/game/questHelpers";
import { loadAvatar, saveAvatar } from "../lib/game/profiles";
import {
  deleteQuestPath,
  loadQuestPaths,
  saveQuestPath,
} from "../lib/game/quests";
import type {
  Avatar,
  DoneQuestsMap,
  Quest,
  QuestStep,
  StepDraft,
} from "../lib/game/types";
import { WheelPanel } from "./WheelPanel";

type PageTab = "quests" | "wheel";

export function QuestsPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [customQuests, setCustomQuests] = useState<Quest[]>([]);
  const [doneQuests, setDoneQuests] = useState<DoneQuestsMap>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<PageTab>("quests");

  const [editingQuestId, setEditingQuestId] = useState("");
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORY_ID);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [systematic, setSystematic] = useState(false);
  const [stepDrafts, setStepDrafts] = useState<StepDraft[]>(defaultStepDrafts);
  const [formError, setFormError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadAvatar();
        if (!loaded || !loaded.name) {
          if (!cancelled) setAvatar(null);
          return;
        }
        const paths = await loadQuestPaths();
        const done = await loadDoneQuests();
        if (cancelled) return;
        setAvatar(loaded);
        setCustomQuests(
          paths.map(normalizeQuest).filter((q): q is Quest => Boolean(q))
        );
        setDoneQuests(done);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Could not load quests."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCategories = useMemo(() => {
    const quests = customQuests;
    return CATEGORIES.map((category) => ({
      category,
      quests: quests.filter(
        (quest) =>
          quest.category === category.id && !shouldHidePath(doneQuests, quest)
      ),
    }));
  }, [customQuests, doneQuests]);

  const otherQuests = useMemo(
    () =>
      customQuests.filter(
        (quest) => !getCategory(quest.category) && !shouldHidePath(doneQuests, quest)
      ),
    [customQuests, doneQuests]
  );

  function clearQuestForm() {
    setEditingQuestId("");
    setCategoryId(DEFAULT_CATEGORY_ID);
    setTitle("");
    setDescription("");
    setReward("");
    setSystematic(false);
    setStepDrafts(defaultStepDrafts());
    setFormError("");
  }

  function startEditQuest(questId: string) {
    const quest = customQuests.find((item) => item.id === questId);
    if (!quest) return;
    setEditingQuestId(quest.id);
    setCategoryId(quest.category);
    setTitle(quest.title);
    setDescription(quest.description || "");
    setReward(quest.reward || "");
    setSystematic(Boolean(quest.systematic));
    setFormError("");
    setStepDrafts(
      quest.steps.map((step) => ({
        title: step.title,
        xp: step.xp,
        boss: step.kind === "boss",
      }))
    );
  }

  function readStepsFromDrafts(): QuestStep[] {
    const steps: QuestStep[] = [];
    stepDrafts.forEach((draft, index) => {
      const stepTitle = draft.title.trim();
      if (!stepTitle) return;
      steps.push({
        id: "step-" + (index + 1) + "-" + Date.now() + "-" + index,
        kind: draft.boss ? "boss" : "level",
        title: stepTitle,
        xp: clampStepXp(draft.xp),
      });
    });
    return steps;
  }

  async function handleQuestFormSubmit(event: FormEvent) {
    event.preventDefault();
    const steps = readStepsFromDrafts();

    if (!title.trim()) {
      setFormError("Please enter a path title.");
      return;
    }
    if (!getCategory(categoryId)) {
      setFormError("Please choose a valid category.");
      return;
    }
    if (!reward.trim()) {
      setFormError("Please enter a real-life reward.");
      return;
    }
    if (steps.length === 0) {
      setFormError("Add at least one step with a title.");
      return;
    }

    const path: Quest = {
      id: editingQuestId || "custom-" + Date.now(),
      category: categoryId,
      title: title.trim(),
      description: description.trim(),
      reward: reward.trim(),
      rewardClaimed: false,
      systematic,
      custom: true,
      steps,
    };

    if (editingQuestId) {
      const index = customQuests.findIndex((quest) => quest.id === editingQuestId);
      if (index === -1) {
        setFormError("That path could not be found.");
        return;
      }
      const old = customQuests[index];
      path.rewardClaimed = Boolean(old.rewardClaimed);
      const oldSteps = old.steps || [];
      path.steps = steps.map((step, i) => ({
        ...step,
        id: oldSteps[i] ? oldSteps[i].id : step.id,
      }));
    }

    try {
      await saveQuestPath(path);
      const normalized = normalizeQuest(path);
      if (!normalized) return;
      setCustomQuests((prev) => {
        if (editingQuestId) {
          return prev.map((q) => (q.id === editingQuestId ? normalized : q));
        }
        return [...prev, normalized];
      });
      clearQuestForm();
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Could not save path.");
    }
  }

  async function removeCustomQuest(questId: string) {
    try {
      await deleteQuestPath(questId);
      await deleteStepCompletionsForPath(questId);
      setCustomQuests((prev) => prev.filter((quest) => quest.id !== questId));
      setDoneQuests((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key === questId || key.indexOf(questId + "::") === 0) {
            delete next[key];
          }
        });
        return next;
      });
      if (editingQuestId === questId) clearQuestForm();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not remove path.");
    }
  }

  async function claimReward(questId: string) {
    const index = customQuests.findIndex((quest) => quest.id === questId);
    if (index === -1) return;
    const quest = customQuests[index];
    if (!isPathComplete(doneQuests, quest) || !quest.reward || quest.rewardClaimed) {
      return;
    }

    try {
      if (quest.systematic) {
        await deleteStepCompletionsForPath(questId);
        setDoneQuests((prev) => {
          const next = { ...prev };
          const prefix = questId + "::";
          Object.keys(next).forEach((key) => {
            if (key.indexOf(prefix) === 0) delete next[key];
          });
          return next;
        });
        const reset = { ...quest, rewardClaimed: false };
        await saveQuestPath(reset);
        setCustomQuests((prev) =>
          prev.map((q) => (q.id === questId ? reset : q))
        );
      } else {
        const updated = { ...quest, rewardClaimed: true };
        await saveQuestPath(updated);
        setCustomQuests((prev) =>
          prev.map((q) => (q.id === questId ? updated : q))
        );
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not claim reward.");
    }
  }

  async function completeStep(questId: string, stepId: string) {
    console.assert(avatar != null, "completeStep: avatar missing", {
      questId,
      stepId,
    });
    if (!avatar) return;

    const quest = customQuests.find((item) => item.id === questId);
    console.assert(quest != null, "completeStep: quest not found", {
      questId,
      stepId,
    });
    if (!quest) return;

    const step = quest.steps.find((item) => item.id === stepId);
    console.assert(step != null, "completeStep: step not found", {
      questId,
      stepId,
    });
    if (!step) return;

    if (isStepDone(doneQuests, questId, stepId)) return;

    const previousLifetimeXp = avatar.lifetimeXp;
    const nextAvatar = { ...avatar, skills: { ...avatar.skills } };
    gainXp(nextAvatar, step.xp);
    setAvatar(nextAvatar);
    setDoneQuests((prev) => ({
      ...prev,
      [stepDoneKey(questId, stepId)]: true,
    }));

    try {
      await markStepComplete(questId, stepId);
      await saveAvatar(nextAvatar);
    } catch (err) {
      const rollback = { ...avatar, lifetimeXp: previousLifetimeXp };
      applyLifetimeXp(rollback);
      setAvatar(rollback);
      setDoneQuests((prev) => {
        const next = { ...prev };
        delete next[stepDoneKey(questId, stepId)];
        return next;
      });
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not save progress.");
    }
  }

  function onStepDragStart(index: number) {
    setDragIndex(index);
  }

  function onStepDragOver(event: React.DragEvent, overIndex: number) {
    event.preventDefault();
    if (dragIndex === null || dragIndex === overIndex) return;
    setStepDrafts((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(overIndex, 0, moved);
      return next;
    });
    setDragIndex(overIndex);
  }

  function onStepDragEnd() {
    setDragIndex(null);
  }

  async function handleSignOut() {
    try {
      await signOut();
      navigate("/login");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not sign out.");
    }
  }

  if (loading) {
    return (
      <main className="app">
        <p className="page-intro">Loading…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="app">
        <p className="error">{loadError}</p>
      </main>
    );
  }

  if (!avatar || !avatar.name) {
    return <Navigate to="/create" replace />;
  }

  const needed = avatar.level >= MAX_LEVEL ? 0 : xpToNextLevel(avatar.level);
  const levelText =
    avatar.level >= MAX_LEVEL
      ? "Level " + avatar.level + " (max)"
      : "Level " + avatar.level + " · " + avatar.xp + " / " + needed + " XP";

  return (
    <main className="app">
      <header className="player-header">
        <div className="player-look">{avatar.look}</div>
        <div className="player-meta">
          <p className="player-name">{avatar.name}</p>
          <p className="player-level">{levelText}</p>
        </div>
        <ul className="player-skills">
          {SKILLS.map((skill) => (
            <li key={skill.id}>
              <span>{skill.label}</span>
              <strong>{avatar.skills[skill.id]}</strong>
            </li>
          ))}
        </ul>
      </header>

      <nav className="page-tabs" aria-label="Page sections">
        <button
          type="button"
          className={"page-tab" + (activeTab === "quests" ? " is-active" : "")}
          onClick={() => setActiveTab("quests")}
        >
          Quests
        </button>
        <button
          type="button"
          className={"page-tab" + (activeTab === "wheel" ? " is-active" : "")}
          onClick={() => setActiveTab("wheel")}
        >
          Wheel
        </button>
      </nav>

      {activeTab === "quests" ? (
        <section>
          <header className="quests-page-header">
            <h1>Quests</h1>
          </header>
          <p className="page-intro">
            Build quest paths with steps. Completing a step earns XP.
          </p>

          <form className="add-quest-form" onSubmit={handleQuestFormSubmit}>
            <h2>{editingQuestId ? "Edit quest path" : "Add a quest path"}</h2>

            <label className="field">
              <span>Category</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Path title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Celtic Fiddle Path"
                maxLength={80}
              />
            </label>

            <label className="field">
              <span>Description</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional path summary"
                maxLength={140}
              />
            </label>

            <label className="field">
              <span>Reward</span>
              <input
                type="text"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="e.g. KFC chicken, weighing scale"
                maxLength={80}
              />
            </label>

            <label className="field field-checkbox">
              <input
                type="checkbox"
                checked={systematic}
                onChange={(e) => setSystematic(e.target.checked)}
              />
              <span>
                Systematic — stays after completion; resets when you claim the
                reward
              </span>
            </label>

            <div className="field">
              <span>Steps (XP comes from these)</span>
              <div className="steps-builder">
                {stepDrafts.map((draft, index) => (
                  <div
                    key={index}
                    className={
                      "step-form-row" +
                      (dragIndex === index ? " step-dragging" : "")
                    }
                    onDragOver={(e) => onStepDragOver(e, index)}
                    onDrop={(e) => e.preventDefault()}
                  >
                    <button
                      type="button"
                      className="step-drag-handle"
                      draggable
                      title="Drag to reorder"
                      aria-label="Drag to reorder"
                      onDragStart={() => onStepDragStart(index)}
                      onDragEnd={onStepDragEnd}
                    >
                      ⋮⋮
                    </button>
                    <input
                      type="text"
                      className="step-title-input"
                      placeholder="Step title"
                      maxLength={160}
                      value={draft.title}
                      onChange={(e) => {
                        const value = e.target.value;
                        setStepDrafts((prev) =>
                          prev.map((row, i) =>
                            i === index ? { ...row, title: value } : row
                          )
                        );
                      }}
                    />
                    <input
                      type="number"
                      className="step-xp-input"
                      min={1}
                      max={120}
                      value={draft.xp}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setStepDrafts((prev) =>
                          prev.map((row, i) =>
                            i === index ? { ...row, xp: value } : row
                          )
                        );
                      }}
                    />
                    <label className="step-boss-label">
                      <input
                        type="checkbox"
                        className="step-boss-input"
                        checked={draft.boss}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setStepDrafts((prev) =>
                            prev.map((row, i) =>
                              i === index ? { ...row, boss: checked } : row
                            )
                          );
                        }}
                      />{" "}
                      Boss
                    </label>
                    <button
                      type="button"
                      className="step-remove-row-btn"
                      onClick={() =>
                        setStepDrafts((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="add-step-btn"
                onClick={() =>
                  setStepDrafts((prev) => [
                    ...prev,
                    { title: "", xp: 30, boss: false },
                  ])
                }
              >
                Add step
              </button>
            </div>

            <div className="quest-form-actions">
              <button type="submit" className="create-btn">
                {editingQuestId ? "Save changes" : "Add path"}
              </button>
              {editingQuestId ? (
                <button
                  type="button"
                  className="quest-cancel-btn"
                  onClick={clearQuestForm}
                >
                  Cancel
                </button>
              ) : null}
            </div>
            {formError ? <p className="error">{formError}</p> : null}
          </form>

          <section className="quest-list">
            {visibleCategories.map(({ category, quests }) => (
              <CategorySection
                key={category.id}
                category={category}
                quests={quests}
                doneQuests={doneQuests}
                onCompleteStep={completeStep}
                onClaimReward={claimReward}
                onEdit={startEditQuest}
                onRemove={removeCustomQuest}
              />
            ))}
            {otherQuests.length > 0 ? (
              <CategorySection
                category={{ id: "other", label: "Other", color: "#5c6b7a" }}
                quests={otherQuests}
                doneQuests={doneQuests}
                onCompleteStep={completeStep}
                onClaimReward={claimReward}
                onEdit={startEditQuest}
                onRemove={removeCustomQuest}
              />
            ) : null}
          </section>
        </section>
      ) : (
        <section>
          <WheelPanel />
        </section>
      )}

      <p className="back-link">
        <Link to="/create?new=1">Create a new avatar</Link>
        <button
          type="button"
          className="quest-cancel-btn"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </p>
    </main>
  );
}

function CategorySection({
  category,
  quests,
  doneQuests,
  onCompleteStep,
  onClaimReward,
  onEdit,
  onRemove,
}: {
  category: { id: string; label: string; color: string };
  quests: Quest[];
  doneQuests: DoneQuestsMap;
  onCompleteStep: (questId: string, stepId: string) => void;
  onClaimReward: (questId: string) => void;
  onEdit: (questId: string) => void;
  onRemove: (questId: string) => void;
}) {
  return (
    <section className="quest-category">
      <h2 className="quest-category-title" style={{ color: category.color }}>
        {category.label}
      </h2>
      <div className="quest-category-list">
        {quests.length === 0 ? (
          <p className="category-empty">No paths yet.</p>
        ) : (
          quests.map((quest) => (
            <PathCard
              key={quest.id}
              quest={quest}
              doneQuests={doneQuests}
              onCompleteStep={onCompleteStep}
              onClaimReward={onClaimReward}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
    </section>
  );
}

function PathCard({
  quest,
  doneQuests,
  onCompleteStep,
  onClaimReward,
  onEdit,
  onRemove,
}: {
  quest: Quest;
  doneQuests: DoneQuestsMap;
  onCompleteStep: (questId: string, stepId: string) => void;
  onClaimReward: (questId: string) => void;
  onEdit: (questId: string) => void;
  onRemove: (questId: string) => void;
}) {
  const category = getCategory(quest.category);
  const tagLabel = category ? category.label : quest.category;
  const tagColor = category ? category.color : "#5c6b7a";
  const doneCount = countDoneSteps(doneQuests, quest);
  const complete = isPathComplete(doneQuests, quest);
  const canClaim = complete && quest.reward && !quest.rewardClaimed;

  return (
    <article
      className={"path-card" + (canClaim ? " path-ready-to-claim" : "")}
    >
      <div className="path-header">
        <div className="quest-info">
          <div className="quest-title-line">
            <span className="quest-tag" style={{ background: tagColor }}>
              {tagLabel}
            </span>
            {quest.systematic ? (
              <span className="quest-tag quest-tag-systematic">Systematic</span>
            ) : null}
            <h3>{quest.title}</h3>
          </div>
          {quest.description ? <p>{quest.description}</p> : null}
          {quest.reward ? (
            <p className="path-reward">Reward: {quest.reward}</p>
          ) : null}
          <p className="path-progress">
            {doneCount} / {quest.steps.length} steps
          </p>
        </div>
        <div className="quest-actions">
          {canClaim ? (
            <button
              type="button"
              className="quest-claim-btn"
              onClick={() => onClaimReward(quest.id)}
            >
              Claim reward
            </button>
          ) : null}
          {quest.custom ? (
            <>
              <button
                type="button"
                className="quest-edit-btn"
                onClick={() => onEdit(quest.id)}
              >
                Edit
              </button>
              <button
                type="button"
                className="quest-remove-btn"
                onClick={() => onRemove(quest.id)}
              >
                Remove
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="path-steps">
        {quest.steps.map((step, index) => {
          let levelNumber = 0;
          for (let i = 0; i <= index; i += 1) {
            if (quest.steps[i].kind !== "boss") levelNumber += 1;
          }
          if (step.kind === "boss") levelNumber = 0;
          const done = isStepDone(doneQuests, quest.id, step.id);
          return (
            <article
              key={step.id}
              className={
                "step-row" +
                (done ? " step-done" : "") +
                (step.kind === "boss" ? " step-boss" : "")
              }
            >
              <div className="step-info">
                <p className="step-label">{stepLabel(step, levelNumber)}</p>
                <p className="step-title">{step.title}</p>
                <span className="quest-xp">+{step.xp} XP</span>
              </div>
              <div className="quest-actions">
                <button
                  type="button"
                  className="quest-btn"
                  disabled={done}
                  onClick={() => onCompleteStep(quest.id, step.id)}
                >
                  {done ? "Done" : "Complete"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </article>
  );
}
