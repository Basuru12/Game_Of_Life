// Quests page — paths with XP steps (uses game.js helpers)

const MAX_STEP_XP = 120;

const CATEGORIES = LIFE_AREAS;

const QUESTS = [];

function getCategory(id) {
  return CATEGORIES.find((category) => category.id === id);
}

function stepDoneKey(questId, stepId) {
  return questId + "::" + stepId;
}

function clampStepXp(value) {
  let xp = Number(value);
  if (!Number.isFinite(xp) || xp < 1) xp = 30;
  if (xp > MAX_STEP_XP) xp = MAX_STEP_XP;
  return xp;
}

function normalizeQuest(quest) {
  if (!quest || typeof quest !== "object") return null;

  const reward = typeof quest.reward === "string" ? quest.reward : "";
  const rewardClaimed = Boolean(quest.rewardClaimed);

  if (Array.isArray(quest.steps) && quest.steps.length > 0) {
    return {
      id: quest.id,
      category: quest.category,
      title: quest.title,
      description: quest.description || "",
      reward: reward,
      rewardClaimed: rewardClaimed,
      custom: Boolean(quest.custom),
      steps: quest.steps.map((step, index) => ({
        id: step.id || "step-" + (index + 1),
        kind: step.kind === "boss" ? "boss" : "level",
        title: step.title || "",
        xp: clampStepXp(step.xp),
      })),
    };
  }

  // Old flat quest → one step
  return {
    id: quest.id,
    category: quest.category,
    title: quest.title,
    description: quest.description || "",
    reward: reward,
    rewardClaimed: rewardClaimed,
    custom: Boolean(quest.custom),
    steps: [
      {
        id: "step-1",
        kind: "level",
        title: quest.title || "Step 1",
        xp: clampStepXp(quest.xp),
      },
    ],
  };
}

let customQuests = [];
let doneQuests = {};

function allQuests() {
  return QUESTS.map(normalizeQuest).filter(Boolean).concat(customQuests);
}

function isStepDone(questId, stepId) {
  return Boolean(doneQuests[stepDoneKey(questId, stepId)]);
}

function countDoneSteps(quest) {
  let count = 0;
  quest.steps.forEach((step) => {
    if (isStepDone(quest.id, step.id)) count += 1;
  });
  return count;
}

function isPathComplete(quest) {
  return (
    quest.steps.length > 0 && countDoneSteps(quest) === quest.steps.length
  );
}

function shouldHidePath(quest) {
  if (!isPathComplete(quest)) return false;
  if (!quest.reward || quest.rewardClaimed) return true;
  return false;
}

function stepLabel(step, levelNumber) {
  if (step.kind === "boss") return "BOSS BATTLE";
  return "Level " + levelNumber;
}

function switchPageTab(tabId) {
  document.querySelectorAll(".page-tab").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-tab") === tabId);
  });
  document.getElementById("tab-quests").classList.toggle("hidden", tabId !== "quests");
  document.getElementById("tab-wheel").classList.toggle("hidden", tabId !== "wheel");

  if (tabId === "wheel" && typeof bootWheel === "function") {
    bootWheel().catch(function (error) {
      console.error(error);
      alert(error.message || "Could not load wheel.");
    });
  }
}

function startQuestsPage() {
  fillCategorySelect();
  clearQuestForm();
  renderHeader();
  renderQuests();

  document
    .getElementById("add-quest-form")
    .addEventListener("submit", handleQuestFormSubmit);
  document
    .getElementById("quest-cancel-btn")
    .addEventListener("click", clearQuestForm);
  document
    .getElementById("add-step-btn")
    .addEventListener("click", () => addStepRow());
  document.getElementById("signout-btn").addEventListener("click", async () => {
    try {
      await signOut();
      location.href = "login.html";
    } catch (error) {
      alert(error.message || "Could not sign out.");
    }
  });

  document.querySelectorAll(".page-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchPageTab(btn.getAttribute("data-tab"));
    });
  });

  const builder = document.getElementById("steps-builder");
  builder.addEventListener("dragover", onStepDragOver);
  builder.addEventListener("drop", onStepDrop);
}

let draggedStepRow = null;

function onStepDragOver(event) {
  event.preventDefault();
  if (!draggedStepRow) return;

  const builder = document.getElementById("steps-builder");
  const targetRow = event.target.closest(".step-form-row");
  if (!targetRow || targetRow === draggedStepRow || !builder.contains(targetRow)) {
    return;
  }

  document.querySelectorAll(".step-form-row.step-drag-over").forEach((row) => {
    row.classList.remove("step-drag-over");
  });
  targetRow.classList.add("step-drag-over");

  const rect = targetRow.getBoundingClientRect();
  const before = event.clientY < rect.top + rect.height / 2;

  if (before) {
    builder.insertBefore(draggedStepRow, targetRow);
  } else {
    builder.insertBefore(draggedStepRow, targetRow.nextSibling);
  }
}

function onStepDrop(event) {
  event.preventDefault();
  document.querySelectorAll(".step-form-row.step-drag-over").forEach((row) => {
    row.classList.remove("step-drag-over");
  });
}

function clearStepsBuilder() {
  document.getElementById("steps-builder").innerHTML = "";
}

function addStepRow(draft) {
  const data = draft || { title: "", xp: 30, boss: false };
  const builder = document.getElementById("steps-builder");
  const row = document.createElement("div");
  row.className = "step-form-row";

  row.innerHTML =
    '<button type="button" class="step-drag-handle" draggable="true" title="Drag to reorder" aria-label="Drag to reorder">⋮⋮</button>' +
    '<input type="text" class="step-title-input" placeholder="Step title" maxlength="160" />' +
    '<input type="number" class="step-xp-input" min="1" max="120" />' +
    '<label class="step-boss-label"><input type="checkbox" class="step-boss-input" /> Boss</label>' +
    '<button type="button" class="step-remove-row-btn">Remove</button>';

  row.querySelector(".step-title-input").value = data.title || "";
  row.querySelector(".step-xp-input").value = String(data.xp || 30);
  row.querySelector(".step-boss-input").checked = Boolean(data.boss);

  const handle = row.querySelector(".step-drag-handle");

  handle.addEventListener("dragstart", (event) => {
    draggedStepRow = row;
    row.classList.add("step-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "step");
  });

  handle.addEventListener("dragend", () => {
    row.classList.remove("step-dragging");
    document.querySelectorAll(".step-form-row.step-drag-over").forEach((item) => {
      item.classList.remove("step-drag-over");
    });
    draggedStepRow = null;
  });

  row.querySelector(".step-remove-row-btn").addEventListener("click", () => {
    row.remove();
  });

  builder.appendChild(row);
}

function fillStepsBuilder(drafts) {
  clearStepsBuilder();
  drafts.forEach((draft) => addStepRow(draft));
}

function readStepsFromForm() {
  const rows = document.querySelectorAll("#steps-builder .step-form-row");
  const steps = [];

  rows.forEach((row, index) => {
    const title = row.querySelector(".step-title-input").value.trim();
    const xp = clampStepXp(row.querySelector(".step-xp-input").value);
    const boss = row.querySelector(".step-boss-input").checked;

    if (!title) return;

    steps.push({
      id: "step-" + (index + 1) + "-" + Date.now() + "-" + index,
      kind: boss ? "boss" : "level",
      title: title,
      xp: xp,
    });
  });

  return steps;
}

function fillCategorySelect() {
  const select = document.getElementById("quest-category");
  select.innerHTML = "";

  CATEGORIES.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.label;
    select.appendChild(option);
  });
}

function defaultStepDrafts() {
  return [
    { title: "", xp: 100, boss: false },
    { title: "", xp: 20, boss: false },
    { title: "", xp: 20, boss: false },
    { title: "", xp: 50, boss: false },
    { title: "", xp: 50, boss: false },
    { title: "", xp: 100, boss: true },
  ];
}

function clearQuestForm() {
  document.getElementById("editing-quest-id").value = "";
  document.getElementById("quest-form-title").textContent = "Add a quest path";
  document.getElementById("quest-submit-btn").textContent = "Add path";
  document.getElementById("quest-cancel-btn").classList.add("hidden");
  document.getElementById("quest-title").value = "";
  document.getElementById("quest-description").value = "";
  document.getElementById("quest-reward").value = "";
  document.getElementById("quest-category").selectedIndex = 0;
  document.getElementById("add-quest-error").classList.add("hidden");
  fillStepsBuilder(defaultStepDrafts());
}

function startEditQuest(questId) {
  const quest = customQuests.find((item) => item.id === questId);
  if (!quest) return;

  document.getElementById("editing-quest-id").value = quest.id;
  document.getElementById("quest-form-title").textContent = "Edit quest path";
  document.getElementById("quest-submit-btn").textContent = "Save changes";
  document.getElementById("quest-cancel-btn").classList.remove("hidden");
  document.getElementById("quest-category").value = quest.category;
  document.getElementById("quest-title").value = quest.title;
  document.getElementById("quest-description").value = quest.description || "";
  document.getElementById("quest-reward").value = quest.reward || "";
  document.getElementById("add-quest-error").classList.add("hidden");

  fillStepsBuilder(
    quest.steps.map((step) => ({
      title: step.title,
      xp: step.xp,
      boss: step.kind === "boss",
    }))
  );

  document.getElementById("add-quest-form").scrollIntoView({ behavior: "smooth" });
  document.getElementById("quest-title").focus();
}

async function handleQuestFormSubmit(event) {
  event.preventDefault();

  const editingId = document.getElementById("editing-quest-id").value;
  const categoryId = document.getElementById("quest-category").value;
  const title = document.getElementById("quest-title").value.trim();
  const description = document.getElementById("quest-description").value.trim();
  const reward = document.getElementById("quest-reward").value.trim();
  const errorEl = document.getElementById("add-quest-error");
  const steps = readStepsFromForm();

  if (!title) {
    errorEl.textContent = "Please enter a path title.";
    errorEl.classList.remove("hidden");
    return;
  }

  if (!getCategory(categoryId)) {
    errorEl.textContent = "Please choose a valid category.";
    errorEl.classList.remove("hidden");
    return;
  }

  if (!reward) {
    errorEl.textContent = "Please enter a real-life reward.";
    errorEl.classList.remove("hidden");
    return;
  }

  if (steps.length === 0) {
    errorEl.textContent = "Add at least one step with a title.";
    errorEl.classList.remove("hidden");
    return;
  }

  const path = {
    id: editingId || "custom-" + Date.now(),
    category: categoryId,
    title: title,
    description: description || "",
    reward: reward,
    rewardClaimed: false,
    custom: true,
    steps: steps,
  };

  if (editingId) {
    const index = customQuests.findIndex((quest) => quest.id === editingId);
    if (index === -1) {
      errorEl.textContent = "That path could not be found.";
      errorEl.classList.remove("hidden");
      return;
    }

    const old = customQuests[index];
    path.rewardClaimed = Boolean(old.rewardClaimed);

    // Keep existing step ids when order aligns so progress can persist
    const oldSteps = old.steps || [];
    path.steps = steps.map((step, i) => ({
      ...step,
      id: oldSteps[i] ? oldSteps[i].id : step.id,
    }));
  }

  try {
    await saveQuestPath(path);
    const normalized = normalizeQuest(path);
    if (editingId) {
      const index = customQuests.findIndex((quest) => quest.id === editingId);
      customQuests[index] = normalized;
    } else {
      customQuests.push(normalized);
    }
    clearQuestForm();
    renderQuests();
  } catch (error) {
    console.error(error);
    errorEl.textContent = error.message || "Could not save path.";
    errorEl.classList.remove("hidden");
  }
}

async function removeCustomQuest(questId) {
  try {
    await deleteQuestPath(questId);
    await deleteStepCompletionsForPath(questId);

    customQuests = customQuests.filter((quest) => quest.id !== questId);

    Object.keys(doneQuests).forEach((key) => {
      if (key === questId || key.indexOf(questId + "::") === 0) {
        delete doneQuests[key];
      }
    });

    if (document.getElementById("editing-quest-id").value === questId) {
      clearQuestForm();
    }

    renderQuests();
  } catch (error) {
    console.error(error);
    alert(error.message || "Could not remove path.");
  }
}

function renderHeader() {
  const header = document.getElementById("player-header");
  const needed =
    avatar.level >= MAX_LEVEL ? 0 : xpToNextLevel(avatar.level);

  let skillsHtml = "";
  SKILLS.forEach((skill) => {
    skillsHtml +=
      "<li><span>" +
      skill.label +
      "</span><strong>" +
      avatar.skills[skill.id] +
      "</strong></li>";
  });

  const levelText =
    avatar.level >= MAX_LEVEL
      ? "Level " + avatar.level + " (max)"
      : "Level " + avatar.level + " · " + avatar.xp + " / " + needed + " XP";

  header.innerHTML =
    '<div class="player-look">' +
    avatar.look +
    "</div>" +
    '<div class="player-meta">' +
    '<p class="player-name">' +
    avatar.name +
    "</p>" +
    '<p class="player-level">' +
    levelText +
    "</p>" +
    "</div>" +
    '<ul class="player-skills">' +
    skillsHtml +
    "</ul>";
}

function makeStepRow(quest, step, index) {
  const done = isStepDone(quest.id, step.id);

  let levelNumber = 0;
  for (let i = 0; i <= index; i += 1) {
    if (quest.steps[i].kind !== "boss") levelNumber += 1;
  }
  if (step.kind === "boss") levelNumber = 0;

  const row = document.createElement("article");
  row.className =
    "step-row" +
    (done ? " step-done" : "") +
    (step.kind === "boss" ? " step-boss" : "");

  const label = stepLabel(step, levelNumber);

  row.innerHTML =
    '<div class="step-info">' +
    '<p class="step-label">' +
    label +
    "</p>" +
    '<p class="step-title">' +
    step.title +
    "</p>" +
    '<span class="quest-xp">+' +
    step.xp +
    " XP</span>" +
    "</div>";

  const actions = document.createElement("div");
  actions.className = "quest-actions";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "quest-btn";

  if (done) {
    btn.textContent = "Done";
    btn.disabled = true;
  } else {
    btn.textContent = "Complete";
    btn.addEventListener("click", () => completeStep(quest.id, step.id));
  }

  actions.appendChild(btn);
  row.appendChild(actions);
  return row;
}

function makePathCard(quest) {
  const category = getCategory(quest.category);
  const tagLabel = category ? category.label : quest.category;
  const tagColor = category ? category.color : "#5c6b7a";
  const doneCount = countDoneSteps(quest);
  const complete = isPathComplete(quest);
  const canClaim = complete && quest.reward && !quest.rewardClaimed;

  const card = document.createElement("article");
  card.className = "path-card" + (canClaim ? " path-ready-to-claim" : "");

  const header = document.createElement("div");
  header.className = "path-header";

  header.innerHTML =
    '<div class="quest-info">' +
    '<div class="quest-title-line">' +
    '<span class="quest-tag" style="background:' +
    tagColor +
    '">' +
    tagLabel +
    "</span>" +
    "<h3>" +
    quest.title +
    "</h3>" +
    "</div>" +
    (quest.description ? "<p>" + quest.description + "</p>" : "") +
    (quest.reward
      ? '<p class="path-reward">Reward: ' + quest.reward + "</p>"
      : "") +
    '<p class="path-progress">' +
    doneCount +
    " / " +
    quest.steps.length +
    " steps</p>" +
    "</div>";

  const actions = document.createElement("div");
  actions.className = "quest-actions";

  if (canClaim) {
    const claimBtn = document.createElement("button");
    claimBtn.type = "button";
    claimBtn.className = "quest-claim-btn";
    claimBtn.textContent = "Claim reward";
    claimBtn.addEventListener("click", () => claimReward(quest.id));
    actions.appendChild(claimBtn);
  }

  if (quest.custom) {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "quest-edit-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEditQuest(quest.id));
    actions.appendChild(editBtn);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "quest-remove-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeCustomQuest(quest.id));
    actions.appendChild(removeBtn);
  }

  header.appendChild(actions);
  card.appendChild(header);

  const stepsList = document.createElement("div");
  stepsList.className = "path-steps";

  quest.steps.forEach((step, index) => {
    stepsList.appendChild(makeStepRow(quest, step, index));
  });

  card.appendChild(stepsList);
  return card;
}

async function claimReward(questId) {
  const index = customQuests.findIndex((quest) => quest.id === questId);
  if (index === -1) return;

  const quest = customQuests[index];
  if (!isPathComplete(quest) || !quest.reward || quest.rewardClaimed) return;

  const updated = {
    ...quest,
    rewardClaimed: true,
  };

  try {
    await saveQuestPath(updated);
    customQuests[index] = updated;
    renderQuests();
  } catch (error) {
    console.error(error);
    alert(error.message || "Could not claim reward.");
  }
}

function renderQuestCategorySection(list, category, inCategory) {
  const section = document.createElement("section");
  section.className = "quest-category";

  const heading = document.createElement("h2");
  heading.className = "quest-category-title";
  heading.style.color = category.color;
  heading.textContent = category.label;
  section.appendChild(heading);

  const rows = document.createElement("div");
  rows.className = "quest-category-list";

  if (inCategory.length === 0) {
    const empty = document.createElement("p");
    empty.className = "category-empty";
    empty.textContent = "No paths yet.";
    rows.appendChild(empty);
  } else {
    inCategory.forEach((quest) => {
      rows.appendChild(makePathCard(quest));
    });
  }

  section.appendChild(rows);
  list.appendChild(section);
}

function renderQuests() {
  const list = document.getElementById("quest-list");
  list.innerHTML = "";
  const quests = allQuests();

  CATEGORIES.forEach((category) => {
    const inCategory = quests.filter(
      (quest) => quest.category === category.id && !shouldHidePath(quest)
    );
    renderQuestCategorySection(list, category, inCategory);
  });

  const otherQuests = quests.filter(
    (quest) => !getCategory(quest.category) && !shouldHidePath(quest)
  );
  if (otherQuests.length > 0) {
    renderQuestCategorySection(
      list,
      { id: "other", label: "Other", color: "#5c6b7a" },
      otherQuests
    );
  }
}

async function completeStep(questId, stepId) {
  const quest = allQuests().find((item) => item.id === questId);
  if (!quest) return;

  const step = quest.steps.find((item) => item.id === stepId);
  if (!step) return;
  if (isStepDone(questId, stepId)) return;

  const previousXp = avatar.xp;
  const previousLevel = avatar.level;
  gainXp(avatar, step.xp);
  doneQuests[stepDoneKey(questId, stepId)] = true;

  try {
    await markStepComplete(questId, stepId);
    await saveAvatar(avatar);
    renderHeader();
    renderQuests();
  } catch (error) {
    avatar.xp = previousXp;
    avatar.level = previousLevel;
    delete doneQuests[stepDoneKey(questId, stepId)];
    console.error(error);
    alert(error.message || "Could not save progress.");
  }
}

let avatar = null;

async function bootQuestsPage() {
  await migrateLocalStorageIfNeeded();

  avatar = await loadAvatar();
  if (!avatar || !avatar.name) {
    location.href = "index.html";
    return;
  }

  const paths = await loadQuestPaths();
  customQuests = paths.map(normalizeQuest).filter(Boolean);
  doneQuests = await loadDoneQuests();

  startQuestsPage();
}

bootQuestsPage().catch(function (error) {
  console.error(error);
  alert(error.message || "Could not load quests.");
});
