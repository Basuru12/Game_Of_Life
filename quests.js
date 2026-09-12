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
    .addEventListener("submit", handleAddQuest);
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

function handleAddQuest(event) {
  event.preventDefault();

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
  custom.push({
    id: "custom-" + Date.now(),
    category: categoryId,
    title: title,
    description: description || "Custom quest",
    xp: xp,
    custom: true,
  });
  saveCustomQuests(custom);

  errorEl.classList.add("hidden");
  document.getElementById("quest-title").value = "";
  document.getElementById("quest-description").value = "";
  document.getElementById("quest-xp").value = "30";

  renderQuests();
}

function removeCustomQuest(questId) {
  const next = loadCustomQuests().filter((quest) => quest.id !== questId);
  saveCustomQuests(next);

  if (doneQuests[questId]) {
    delete doneQuests[questId];
    saveDoneQuests(doneQuests);
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
