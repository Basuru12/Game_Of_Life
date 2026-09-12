// Quests page — uses shared helpers from game.js

const QUESTS = [
  {
    id: "gym",
    title: "Do a gym session",
    description: "Train with progressive overload. Builds Strength.",
    xp: 40,
  },
  {
    id: "sleep",
    title: "Sleep 7+ hours",
    description: "Rest well tonight. Builds Recovery.",
    xp: 30,
  },
  {
    id: "planned-task",
    title: "Finish one planned task",
    description: "Do it even if you resist. Builds Discipline.",
    xp: 35,
  },
  {
    id: "read",
    title: "Read for 20 minutes",
    description: "Books or technical study. Builds Intelligence.",
    xp: 35,
  },
];

const avatar = loadAvatar();

if (!avatar || !avatar.name) {
  location.href = "index.html";
} else {
  startQuestsPage();
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
  renderHeader();
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
      '</span><strong>' +
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

function renderQuests() {
  const list = document.getElementById("quest-list");
  list.innerHTML = "";

  QUESTS.forEach((quest) => {
    const done = Boolean(doneQuests[quest.id]);
    const row = document.createElement("article");
    row.className = "quest-row" + (done ? " quest-done" : "");

    row.innerHTML =
      '<div class="quest-info">' +
      "<h2>" +
      quest.title +
      "</h2>" +
      "<p>" +
      quest.description +
      "</p>" +
      '<span class="quest-xp">+' +
      quest.xp +
      " XP</span>" +
      "</div>";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quest-btn";
    btn.textContent = done ? "Done" : "Complete";
    btn.disabled = done;
    btn.addEventListener("click", () => completeQuest(quest.id));

    row.appendChild(btn);
    list.appendChild(row);
  });
}

function completeQuest(questId) {
  if (doneQuests[questId]) return;

  const quest = QUESTS.find((item) => item.id === questId);
  if (!quest) return;

  gainXp(avatar, quest.xp);
  doneQuests[questId] = true;

  saveAvatar(avatar);
  saveDoneQuests(doneQuests);
  renderHeader();
  renderQuests();
}
