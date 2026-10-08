// Wheel of Life — SVG chart + score editor (uses game.js helpers)

const WHEEL_AREAS = [
  { id: "romance", label: "Romance", color: "#c44b4b" },
  { id: "family", label: "Family", color: "#c45a9a" },
  { id: "friends", label: "Friends", color: "#6aa8c9" },
  { id: "growth", label: "Growth", color: "#d4653a" },
  { id: "money", label: "Money", color: "#4caf50" },
  { id: "mission", label: "Mission", color: "#2f5f9a" },
  { id: "body", label: "Body", color: "#c47a3a" },
  { id: "mind", label: "Mind", color: "#d4b83a" },
  { id: "soul", label: "Soul", color: "#e0a878" },
];

const WHEEL_DEFAULT_SCORE = 5;
const WHEEL_MIN = 1;
const WHEEL_MAX = 10;

let wheelScores = {};
let focusedWheelArea = null;
let draftWheelScore = WHEEL_DEFAULT_SCORE;
let wheelBooted = false;
let wheelListenersBound = false;

function clampWheelScore(value) {
  let score = Number(value);
  if (!Number.isFinite(score)) score = WHEEL_DEFAULT_SCORE;
  score = Math.round(score);
  if (score < WHEEL_MIN) score = WHEEL_MIN;
  if (score > WHEEL_MAX) score = WHEEL_MAX;
  return score;
}

function getWheelScore(areaId) {
  if (Object.prototype.hasOwnProperty.call(wheelScores, areaId)) {
    return clampWheelScore(wheelScores[areaId]);
  }
  return WHEEL_DEFAULT_SCORE;
}

function normalizeWheelScores(raw) {
  const next = {};
  WHEEL_AREAS.forEach((area) => {
    next[area.id] = getScoreFromRaw(raw, area.id);
  });
  return next;
}

function getScoreFromRaw(raw, areaId) {
  if (!raw || typeof raw !== "object") return WHEEL_DEFAULT_SCORE;
  if (!Object.prototype.hasOwnProperty.call(raw, areaId)) {
    return WHEEL_DEFAULT_SCORE;
  }
  return clampWheelScore(raw[areaId]);
}

function polarToCartesian(cx, cy, radius, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeWedge(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    cx,
    cy,
    "L",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArc,
    0,
    end.x,
    end.y,
    "Z",
  ].join(" ");
}

function renderWheelChart() {
  const container = document.getElementById("wheel-chart");
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 118;
  const labelR = 148;
  const slice = 360 / WHEEL_AREAS.length;
  // Start so first slice is centered near top-right like the reference
  const startOffset = -slice / 2;

  let wedges = "";
  let rings = "";
  let labels = "";
  let badges = "";

  // Guide rings
  for (let tick = 2; tick <= 10; tick += 2) {
    const r = (tick / WHEEL_MAX) * outerR;
    rings +=
      '<circle class="wheel-guide-ring" cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      r +
      '" />';
  }

  WHEEL_AREAS.forEach((area, index) => {
    const startAngle = startOffset + index * slice;
    const endAngle = startAngle + slice;
    const midAngle = startAngle + slice / 2;
    const score = getWheelScore(area.id);
    const fillR = (score / WHEEL_MAX) * outerR;
    const focused = focusedWheelArea === area.id;
    const wedgeClass = focused ? "wheel-wedge is-focused" : "wheel-wedge";

    wedges +=
      '<path class="' +
      wedgeClass +
      '" data-area="' +
      area.id +
      '" d="' +
      describeWedge(cx, cy, fillR, startAngle, endAngle) +
      '" fill="' +
      area.color +
      '" />';

    // Divider to outer rim
    const rim = polarToCartesian(cx, cy, outerR, startAngle);
    wedges +=
      '<line class="wheel-divider" x1="' +
      cx +
      '" y1="' +
      cy +
      '" x2="' +
      rim.x +
      '" y2="' +
      rim.y +
      '" />';

    const labelPos = polarToCartesian(cx, cy, labelR, midAngle);
    labels +=
      '<text class="wheel-label" data-area="' +
      area.id +
      '" x="' +
      labelPos.x +
      '" y="' +
      labelPos.y +
      '" text-anchor="middle" dominant-baseline="middle">' +
      area.label.toUpperCase() +
      "</text>";

    const badgeR = Math.max(fillR - 14, 28);
    const badgePos = polarToCartesian(cx, cy, badgeR, midAngle);
    badges +=
      '<g class="wheel-badge" data-area="' +
      area.id +
      '">' +
      '<circle cx="' +
      badgePos.x +
      '" cy="' +
      badgePos.y +
      '" r="12" />' +
      '<text x="' +
      badgePos.x +
      '" y="' +
      badgePos.y +
      '" text-anchor="middle" dominant-baseline="middle">' +
      score +
      "</text></g>";
  });

  // Outer circle
  const rimCircle =
    '<circle class="wheel-rim" cx="' +
    cx +
    '" cy="' +
    cy +
    '" r="' +
    outerR +
    '" />';

  container.innerHTML =
    '<svg class="wheel-svg" viewBox="0 0 ' +
    size +
    " " +
    size +
    '" role="img" aria-label="Wheel of Life">' +
    rings +
    wedges +
    rimCircle +
    labels +
    badges +
    "</svg>";

  container.querySelectorAll("[data-area]").forEach((el) => {
    el.addEventListener("click", () => {
      focusWheelArea(el.getAttribute("data-area"));
    });
  });
}

function focusWheelArea(areaId) {
  const area = WHEEL_AREAS.find((item) => item.id === areaId);
  if (!area) return;

  focusedWheelArea = areaId;
  draftWheelScore = getWheelScore(areaId);

  const editor = document.getElementById("wheel-editor");
  editor.classList.remove("hidden");
  document.getElementById("wheel-editor-label").textContent = area.label;
  document.getElementById("wheel-score-value").textContent = draftWheelScore;
  document.getElementById("wheel-editor-error").classList.add("hidden");

  renderWheelChart();
}

function updateDraftScore(delta) {
  draftWheelScore = clampWheelScore(draftWheelScore + delta);
  document.getElementById("wheel-score-value").textContent = draftWheelScore;
}

async function saveFocusedWheelScore() {
  const errorEl = document.getElementById("wheel-editor-error");
  errorEl.classList.add("hidden");

  if (!focusedWheelArea) return;

  const previous = wheelScores[focusedWheelArea];
  wheelScores[focusedWheelArea] = draftWheelScore;

  try {
    await saveWheelScores(wheelScores);
    renderWheelChart();
  } catch (error) {
    if (previous === undefined) {
      delete wheelScores[focusedWheelArea];
    } else {
      wheelScores[focusedWheelArea] = previous;
    }
    errorEl.textContent = error.message || "Could not save score.";
    errorEl.classList.remove("hidden");
  }
}

function bindWheelListeners() {
  if (wheelListenersBound) return;
  wheelListenersBound = true;

  document
    .getElementById("wheel-score-minus")
    .addEventListener("click", () => updateDraftScore(-1));
  document
    .getElementById("wheel-score-plus")
    .addEventListener("click", () => updateDraftScore(1));
  document
    .getElementById("wheel-score-save")
    .addEventListener("click", () => {
      saveFocusedWheelScore();
    });
}

async function bootWheel() {
  bindWheelListeners();

  if (!wheelBooted) {
    const raw = await loadWheelScores();
    wheelScores = normalizeWheelScores(raw);
    wheelBooted = true;
  }

  renderWheelChart();

  if (focusedWheelArea) {
    focusWheelArea(focusedWheelArea);
  }
}
