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

function makeWheelEntry(score, reason, improvements) {
  return {
    score: clampWheelScore(score),
    reason: typeof reason === "string" ? reason : "",
    improvements: typeof improvements === "string" ? improvements : "",
  };
}

function entryFromRaw(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return makeWheelEntry(value.score, value.reason, value.improvements);
  }
  return makeWheelEntry(value, "", "");
}

function getWheelEntry(areaId) {
  if (Object.prototype.hasOwnProperty.call(wheelScores, areaId)) {
    return entryFromRaw(wheelScores[areaId]);
  }
  return makeWheelEntry(WHEEL_DEFAULT_SCORE, "", "");
}

function getWheelScore(areaId) {
  return getWheelEntry(areaId).score;
}

function normalizeWheelScores(raw) {
  const next = {};
  WHEEL_AREAS.forEach((area) => {
    if (raw && typeof raw === "object" && Object.prototype.hasOwnProperty.call(raw, area.id)) {
      next[area.id] = entryFromRaw(raw[area.id]);
    } else {
      next[area.id] = makeWheelEntry(WHEEL_DEFAULT_SCORE, "", "");
    }
  });
  return next;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatHoverNotes(entry) {
  const reason = (entry.reason || "").trim();
  const improvements = (entry.improvements || "").trim();
  if (!reason && !improvements) return "";

  let html = "";
  if (reason) {
    html +=
      '<p class="wheel-tooltip-block"><strong>Score reason</strong><br />' +
      escapeHtml(reason) +
      "</p>";
  }
  if (improvements) {
    html +=
      '<p class="wheel-tooltip-block"><strong>Improvements</strong><br />' +
      escapeHtml(improvements) +
      "</p>";
  }
  return html;
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

function hideWheelTooltip() {
  const tip = document.getElementById("wheel-tooltip");
  if (!tip) return;
  tip.classList.add("hidden");
  tip.innerHTML = "";
}

function showWheelTooltip(areaId, clientX, clientY) {
  const tip = document.getElementById("wheel-tooltip");
  const chart = document.getElementById("wheel-chart");
  if (!tip || !chart) return;

  const area = WHEEL_AREAS.find((item) => item.id === areaId);
  if (!area) return;

  const entry = getWheelEntry(areaId);
  const notesHtml = formatHoverNotes(entry);
  if (!notesHtml) {
    hideWheelTooltip();
    return;
  }

  tip.innerHTML =
    '<p class="wheel-tooltip-title">' + escapeHtml(area.label) + "</p>" + notesHtml;
  tip.classList.remove("hidden");

  const rect = chart.getBoundingClientRect();
  let left = clientX - rect.left + 12;
  let top = clientY - rect.top + 12;
  tip.style.left = left + "px";
  tip.style.top = top + "px";

  const tipRect = tip.getBoundingClientRect();
  if (tipRect.right > rect.right) {
    left = Math.max(8, left - tipRect.width - 24);
  }
  if (tipRect.bottom > rect.bottom) {
    top = Math.max(8, top - tipRect.height - 24);
  }
  tip.style.left = left + "px";
  tip.style.top = top + "px";
}

function renderWheelChart() {
  const container = document.getElementById("wheel-chart");
  const tooltip = document.getElementById("wheel-tooltip");
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 118;
  const labelR = 148;
  const slice = 360 / WHEEL_AREAS.length;
  const startOffset = -slice / 2;

  let hits = "";
  let wedges = "";
  let rings = "";
  let labels = "";
  let badges = "";

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
    const entry = getWheelEntry(area.id);
    const score = entry.score;
    const fillR = (score / WHEEL_MAX) * outerR;
    const focused = focusedWheelArea === area.id;
    const wedgeClass = focused ? "wheel-wedge is-focused" : "wheel-wedge";

    hits +=
      '<path class="wheel-hit" data-area="' +
      area.id +
      '" d="' +
      describeWedge(cx, cy, outerR, startAngle, endAngle) +
      '" />';

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

  const rimCircle =
    '<circle class="wheel-rim" cx="' +
    cx +
    '" cy="' +
    cy +
    '" r="' +
    outerR +
    '" />';

  const svgHtml =
    '<svg class="wheel-svg" viewBox="0 0 ' +
    size +
    " " +
    size +
    '" role="img" aria-label="Wheel of Life">' +
    rings +
    hits +
    wedges +
    rimCircle +
    labels +
    badges +
    "</svg>";

  container.innerHTML = svgHtml;
  if (tooltip) {
    container.appendChild(tooltip);
    hideWheelTooltip();
  }

  container.querySelectorAll("[data-area]").forEach((el) => {
    const areaId = el.getAttribute("data-area");
    el.addEventListener("click", () => {
      hideWheelTooltip();
      focusWheelArea(areaId);
    });
    el.addEventListener("mouseenter", (event) => {
      showWheelTooltip(areaId, event.clientX, event.clientY);
    });
    el.addEventListener("mousemove", (event) => {
      showWheelTooltip(areaId, event.clientX, event.clientY);
    });
    el.addEventListener("mouseleave", () => {
      hideWheelTooltip();
    });
  });
}

function focusWheelArea(areaId) {
  const area = WHEEL_AREAS.find((item) => item.id === areaId);
  if (!area) return;

  const entry = getWheelEntry(areaId);
  focusedWheelArea = areaId;
  draftWheelScore = entry.score;

  const editor = document.getElementById("wheel-editor");
  editor.classList.remove("hidden");
  document.getElementById("wheel-editor-label").textContent = area.label;
  document.getElementById("wheel-score-value").textContent = draftWheelScore;
  document.getElementById("wheel-reason").value = entry.reason;
  document.getElementById("wheel-improvements").value = entry.improvements;
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
  const nextEntry = makeWheelEntry(
    draftWheelScore,
    document.getElementById("wheel-reason").value.trim(),
    document.getElementById("wheel-improvements").value.trim()
  );
  wheelScores[focusedWheelArea] = nextEntry;

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
