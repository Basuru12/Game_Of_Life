// Quests page — uses shared helpers from game.js

const CUSTOM_QUESTS_KEY = "lifeRpgCustomQuests";

const CATEGORIES = [
  { id: "physical", label: "Physical", color: "#c45c26" },
  { id: "mental", label: "Mental", color: "#3b6ea5" },
  { id: "fun", label: "Fun", color: "#c9a227" },
  { id: "work", label: "Work", color: "#4a6b5a" },
  { id: "adventure", label: "Adventure", color: "#2a8f7a" },
  { id: "courage", label: "Courage", color: "#b33b3b" },
  { id: "freedom", label: "Freedom", color: "#6b5b95" },
  { id: "master", label: "Master", color: "#8b6914" },
  { id: "gratitude", label: "Gratitude", color: "#5a8f3d" },
  { id: "legacy", label: "Legacy", color: "#5c6b7a" },
];

const QUESTS = [];

function getCategory(id) {
  return CATEGORIES.find((category) => category.id === id);
}

function loadCustomQuests() {
  const raw = localStorage.getItem(CUSTOM_QUESTS_KEY);
  if (!raw) return [];

  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    return [];
  }
}

function saveCustomQuests(list) {
  localStorage.setItem(CUSTOM_QUESTS_KEY, JSON.stringify(list));
}

function allQuests() {
  return QUESTS.concat(loadCustomQuests());
}

function loadDoneQuests() {
  const raw = localStorage.getItem(QUEST_DONE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

function saveDoneQuests(done) {
  localStorage.setItem(QUEST_DONE_KEY, JSON.stringify(done));
}

let doneQuests = {};

function startQuestsPage() {
  doneQuests = loadDoneQuests();
  fillCategorySelect();
  renderHeader();
  renderQuests();

  document
    .getElementById("add-quest-form")
    .addEventListener("submit", handleQuestFormSubmit);
  document
    .getElementById("quest-cancel-btn")
    .addEventListener("click", clearQuestForm);
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

function clearQuestForm() {
  document.getElementById("editing-quest-id").value = "";
  document.getElementById("quest-form-title").textContent = "Add a quest";
  document.getElementById("quest-submit-btn").textContent = "Add quest";
  document.getElementById("quest-cancel-btn").classList.add("hidden");
  document.getElementById("quest-title").value = "";
  document.getElementById("quest-description").value = "";
  document.getElementById("quest-xp").value = "30";
  document.getElementById("quest-category").selectedIndex = 0;
  document.getElementById("add-quest-error").classList.add("hidden");
}

function startEditQuest(questId) {
  const quest = loadCustomQuests().find((item) => item.id === questId);
  if (!quest) return;

  document.getElementById("editing-quest-id").value = quest.id;
  document.getElementById("quest-form-title").textContent = "Edit quest";
  document.getElementById("quest-submit-btn").textContent = "Save changes";
  document.getElementById("quest-cancel-btn").classList.remove("hidden");
  document.getElementById("quest-category").value = quest.category;
  document.getElementById("quest-title").value = quest.title;
  document.getElementById("quest-description").value = quest.description;
  document.getElementById("quest-xp").value = String(quest.xp);
  document.getElementById("add-quest-error").classList.add("hidden");

  document.getElementById("add-quest-form").scrollIntoView({ behavior: "smooth" });
  document.getElementById("quest-title").focus();
}

function handleQuestFormSubmit(event) {
  event.preventDefault();

  const editingId = document.getElementById("editing-quest-id").value;
  const categoryId = document.getElementById("quest-category").value;
  const title = document.getElementById("quest-title").value.trim();
  const description = document.getElementById("quest-description").value.trim();
  const xpInput = Number(document.getElementById("quest-xp").value);
  const errorEl = document.getElementById("add-quest-error");

  if (!title) {
    errorEl.textContent = "Please enter a quest title.";
    errorEl.classList.remove("hidden");
    return;
  }

  if (!getCategory(categoryId)) {
    errorEl.textContent = "Please choose a valid category.";
    errorEl.classList.remove("hidden");
    return;
  }

  const xp = Number.isFinite(xpInput) && xpInput > 0 ? xpInput : 30;
  const custom = loadCustomQuests();

  if (editingId) {
    const index = custom.findIndex((quest) => quest.id === editingId);
    if (index === -1) {
      errorEl.textContent = "That quest could not be found.";
      errorEl.classList.remove("hidden");
      return;
    }

    custom[index] = {
      id: editingId,
      category: categoryId,
      title: title,
      description: description || "Custom quest",
      xp: xp,
      custom: true,
    };
  } else {
    custom.push({
      id: "custom-" + Date.now(),
      category: categoryId,
      title: title,
      description: description || "Custom quest",
      xp: xp,
      custom: true,
    });
  }

  saveCustomQuests(custom);
  clearQuestForm();
  renderQuests();
}

function removeCustomQuest(questId) {
  const next = loadCustomQuests().filter((quest) => quest.id !== questId);
  saveCustomQuests(next);

  if (doneQuests[questId]) {
    delete doneQuests[questId];
    saveDoneQuests(doneQuests);
  }

  if (document.getElementById("editing-quest-id").value === questId) {
    clearQuestForm();
  }

  renderQuests();
}

function renderHeader() {
  const header = document.getElementById("player-header");
  const needed = xpToNextLevel(avatar.level);

  let skillsHtml = "";
  SKILLS.forEach((skill) => {
    skillsHtml +=
      "<li><span>" +
      skill.label +
      "</span><strong>" +
      avatar.skills[skill.id] +
      "</strong></li>";
  });

  header.innerHTML =
    '<div class="player-look">' +
    avatar.look +
    "</div>" +
    '<div class="player-meta">' +
    '<p class="player-name">' +
    avatar.name +
    "</p>" +
    '<p class="player-level">Level ' +
    avatar.level +
    " · " +
    avatar.xp +
    " / " +
    needed +
    " XP</p>" +
    "</div>" +
    '<ul class="player-skills">' +
    skillsHtml +
    "</ul>";
}

function makeQuestRow(quest) {
  const done = Boolean(doneQuests[quest.id]);
  const category = getCategory(quest.category);
  const row = document.createElement("article");
  row.className = "quest-row" + (done ? " quest-done" : "");

  const tagLabel = category ? category.label : quest.category;
  const tagColor = category ? category.color : "#5c6b7a";

  row.innerHTML =
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
    "<p>" +
    quest.description +
    "</p>" +
    '<span class="quest-xp">+' +
    quest.xp +
    " XP</span>" +
    "</div>";

  const actions = document.createElement("div");
  actions.className = "quest-actions";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "quest-btn";
  btn.textContent = done ? "Done" : "Complete";
  btn.disabled = done;
  btn.addEventListener("click", () => completeQuest(quest.id));
  actions.appendChild(btn);

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

  row.appendChild(actions);
  return row;
}

function renderQuests() {
  const list = document.getElementById("quest-list");
  list.innerHTML = "";
  const quests = allQuests();

  CATEGORIES.forEach((category) => {
    const section = document.createElement("section");
    section.className = "quest-category";

    const heading = document.createElement("h2");
    heading.className = "quest-category-title";
    heading.style.color = category.color;
    heading.textContent = category.label;
    section.appendChild(heading);

    const rows = document.createElement("div");
    rows.className = "quest-category-list";

    quests
      .filter((quest) => quest.category === category.id)
      .forEach((quest) => {
        rows.appendChild(makeQuestRow(quest));
      });

    section.appendChild(rows);
    list.appendChild(section);
  });
}

function completeQuest(questId) {
  if (doneQuests[questId]) return;

  const quest = allQuests().find((item) => item.id === questId);
  if (!quest) return;

  gainXp(avatar, quest.xp);
  doneQuests[questId] = true;

  saveAvatar(avatar);
  saveDoneQuests(doneQuests);
  renderHeader();
  renderQuests();
}

const avatar = loadAvatar();

if (!avatar || !avatar.name) {
  location.href = "index.html";
} else {
  startQuestsPage();
}
