// Creation page — uses shared helpers from game.js

const avatar = makeNewAvatar();

function pointsSpent() {
  let spent = 0;
  SKILLS.forEach((skill) => {
    spent += avatar.skills[skill.id] - BASE;
  });
  return spent;
}

function pointsLeft() {
  return POINTS_TOTAL - pointsSpent();
}

function changeSkill(id, delta) {
  const current = avatar.skills[id];
  const next = current + delta;

  if (next < BASE) return;
  if (delta > 0 && pointsLeft() <= 0) return;

  avatar.skills[id] = next;
  updateUI();
}

function buildLookButtons() {
  const container = document.getElementById("look-options");

  LOOKS.forEach((look) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "look-btn";
    btn.textContent = look;
    btn.setAttribute("aria-label", "Choose look " + look);

    btn.addEventListener("click", () => {
      avatar.look = look;
      updateUI();
    });

    container.appendChild(btn);
  });
}

function buildSkillRows() {
  const container = document.getElementById("attributes");

  SKILLS.forEach((skill) => {
    const row = document.createElement("div");
    row.className = "attr-row";
    row.innerHTML =
      '<div class="attr-info">' +
      '<span class="attr-label">' +
      skill.label +
      "</span>" +
      '<span class="attr-hint">' +
      skill.hint +
      "</span>" +
      "</div>" +
      '<div class="attr-controls">' +
      '<button type="button" data-skill="' +
      skill.id +
      '" data-delta="-1">−</button>' +
      '<span class="attr-value" id="skill-' +
      skill.id +
      '">' +
      BASE +
      "</span>" +
      '<button type="button" data-skill="' +
      skill.id +
      '" data-delta="1">+</button>' +
      "</div>";

    container.appendChild(row);
  });

  container.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-skill]");
    if (!btn) return;

    const id = btn.getAttribute("data-skill");
    const delta = Number(btn.getAttribute("data-delta"));
    changeSkill(id, delta);
  });
}

function updateUI() {
  document.getElementById("points-left").textContent = pointsLeft();

  document.querySelectorAll(".look-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.textContent === avatar.look);
  });

  SKILLS.forEach((skill) => {
    const value = avatar.skills[skill.id];
    document.getElementById("skill-" + skill.id).textContent = value;

    const minus = document.querySelector(
      'button[data-skill="' + skill.id + '"][data-delta="-1"]'
    );
    const plus = document.querySelector(
      'button[data-skill="' + skill.id + '"][data-delta="1"]'
    );

    minus.disabled = value <= BASE;
    plus.disabled = pointsLeft() <= 0;
  });
}

function beginGame() {
  const nameInput = document.getElementById("name-input");
  const name = nameInput.value.trim();
  const errorEl = document.getElementById("create-error");

  if (!name) {
    errorEl.textContent = "Please enter a name first.";
    errorEl.classList.remove("hidden");
    return;
  }

  errorEl.classList.add("hidden");
  avatar.name = name;
  avatar.level = 1;
  avatar.xp = 0;

  clearDoneQuests();
  saveAvatar(avatar);
  location.href = "quests.html";
}

buildLookButtons();
buildSkillRows();
updateUI();

document.getElementById("create-btn").addEventListener("click", beginGame);
