import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactElement,
} from "react";
import {
  LIFE_AREAS,
  WHEEL_DEFAULT_SCORE,
  WHEEL_MAX,
  WHEEL_MIN,
} from "../lib/game/constants";
import { loadWheelScores, saveWheelScores } from "../lib/game/profiles";
import type { WheelEntry, WheelScores } from "../lib/game/types";

function clampWheelScore(value: unknown): number {
  let score = Number(value);
  if (!Number.isFinite(score)) score = WHEEL_DEFAULT_SCORE;
  score = Math.round(score);
  if (score < WHEEL_MIN) score = WHEEL_MIN;
  if (score > WHEEL_MAX) score = WHEEL_MAX;
  return score;
}

function makeWheelEntry(
  score: unknown,
  reason: unknown,
  improvements: unknown
): WheelEntry {
  return {
    score: clampWheelScore(score),
    reason: typeof reason === "string" ? reason : "",
    improvements: typeof improvements === "string" ? improvements : "",
  };
}

function entryFromRaw(value: unknown): WheelEntry {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Partial<WheelEntry>;
    return makeWheelEntry(v.score, v.reason, v.improvements);
  }
  return makeWheelEntry(value, "", "");
}

function normalizeWheelScores(raw: Record<string, unknown> | null): WheelScores {
  const next: WheelScores = {};
  LIFE_AREAS.forEach((area) => {
    if (raw && Object.prototype.hasOwnProperty.call(raw, area.id)) {
      next[area.id] = entryFromRaw(raw[area.id]);
    } else {
      next[area.id] = makeWheelEntry(WHEEL_DEFAULT_SCORE, "", "");
    }
  });
  return next;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeWedge(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
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

interface TooltipState {
  areaId: string;
  left: number;
  top: number;
}

export function WheelPanel() {
  const [areaScores, setAreaScores] = useState<WheelScores | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [editorScore, setEditorScore] = useState(WHEEL_DEFAULT_SCORE);
  const [editorReason, setEditorReason] = useState("");
  const [editorImprovements, setEditorImprovements] = useState("");
  const [saveError, setSaveError] = useState("");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadWheelScores()
      .then((raw) => {
        if (!cancelled) setAreaScores(normalizeWheelScores(raw));
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Could not load wheel.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getWheelEntry = useCallback(
    (areaId: string): WheelEntry => {
      if (areaScores && Object.prototype.hasOwnProperty.call(areaScores, areaId)) {
        return entryFromRaw(areaScores[areaId]);
      }
      return makeWheelEntry(WHEEL_DEFAULT_SCORE, "", "");
    },
    [areaScores]
  );

  function selectArea(areaId: string) {
    const area = LIFE_AREAS.find((item) => item.id === areaId);
    if (!area) return;
    const entry = getWheelEntry(areaId);
    setSelectedAreaId(areaId);
    setEditorScore(entry.score);
    setEditorReason(entry.reason);
    setEditorImprovements(entry.improvements);
    setSaveError("");
    setTooltip(null);
  }

  async function saveSelectedAreaScore() {
    if (!selectedAreaId || !areaScores) return;
    setSaveError("");

    const previous = areaScores[selectedAreaId];
    const nextEntry = makeWheelEntry(
      editorScore,
      editorReason.trim(),
      editorImprovements.trim()
    );
    const nextScores = { ...areaScores, [selectedAreaId]: nextEntry };
    setAreaScores(nextScores);

    try {
      await saveWheelScores(nextScores);
    } catch (err) {
      setAreaScores((prev) => {
        if (!prev) return prev;
        const rollback = { ...prev };
        if (previous === undefined) {
          delete rollback[selectedAreaId];
        } else {
          rollback[selectedAreaId] = previous;
        }
        return rollback;
      });
      setSaveError(err instanceof Error ? err.message : "Could not save score.");
    }
  }

  const chart = useMemo(() => {
    if (!areaScores) return null;

    const size = 360;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = 118;
    const labelR = 148;
    const slice = 360 / LIFE_AREAS.length;
    const startOffset = -slice / 2;

    const rings: ReactElement[] = [];
    for (let tick = 2; tick <= 10; tick += 2) {
      const r = (tick / WHEEL_MAX) * outerR;
      rings.push(
        <circle
          key={"ring-" + tick}
          className="wheel-guide-ring"
          cx={cx}
          cy={cy}
          r={r}
        />
      );
    }

    const hits: ReactElement[] = [];
    const wedges: ReactElement[] = [];
    const labels: ReactElement[] = [];
    const badges: ReactElement[] = [];

    LIFE_AREAS.forEach((area, index) => {
      const startAngle = startOffset + index * slice;
      const endAngle = startAngle + slice;
      const midAngle = startAngle + slice / 2;
      const entry = getWheelEntry(area.id);
      const score = entry.score;
      const fillR = (score / WHEEL_MAX) * outerR;
      const selected = selectedAreaId === area.id;
      const wedgeClass = selected ? "wheel-wedge is-focused" : "wheel-wedge";

      hits.push(
        <path
          key={"hit-" + area.id}
          className="wheel-hit"
          data-area={area.id}
          d={describeWedge(cx, cy, outerR, startAngle, endAngle)}
          onClick={() => selectArea(area.id)}
          onMouseEnter={(e) => showTooltip(area.id, e)}
          onMouseMove={(e) => showTooltip(area.id, e)}
          onMouseLeave={() => setTooltip(null)}
        />
      );

      wedges.push(
        <path
          key={"wedge-" + area.id}
          className={wedgeClass}
          data-area={area.id}
          d={describeWedge(cx, cy, fillR, startAngle, endAngle)}
          fill={area.color}
          onClick={() => selectArea(area.id)}
          onMouseEnter={(e) => showTooltip(area.id, e)}
          onMouseMove={(e) => showTooltip(area.id, e)}
          onMouseLeave={() => setTooltip(null)}
        />
      );

      const rim = polarToCartesian(cx, cy, outerR, startAngle);
      wedges.push(
        <line
          key={"div-" + area.id}
          className="wheel-divider"
          x1={cx}
          y1={cy}
          x2={rim.x}
          y2={rim.y}
        />
      );

      const labelPos = polarToCartesian(cx, cy, labelR, midAngle);
      labels.push(
        <text
          key={"label-" + area.id}
          className="wheel-label"
          data-area={area.id}
          x={labelPos.x}
          y={labelPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          onClick={() => selectArea(area.id)}
          onMouseEnter={(e) => showTooltip(area.id, e)}
          onMouseMove={(e) => showTooltip(area.id, e)}
          onMouseLeave={() => setTooltip(null)}
        >
          {area.label.toUpperCase()}
        </text>
      );

      const badgeR = Math.max(fillR - 14, 28);
      const badgePos = polarToCartesian(cx, cy, badgeR, midAngle);
      badges.push(
        <g
          key={"badge-" + area.id}
          className="wheel-badge"
          data-area={area.id}
          onClick={() => selectArea(area.id)}
          onMouseEnter={(e) => showTooltip(area.id, e)}
          onMouseMove={(e) => showTooltip(area.id, e)}
          onMouseLeave={() => setTooltip(null)}
        >
          <circle cx={badgePos.x} cy={badgePos.y} r="12" />
          <text
            x={badgePos.x}
            y={badgePos.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {score}
          </text>
        </g>
      );
    });

    function showTooltip(areaId: string, event: MouseEvent) {
      const entry = getWheelEntry(areaId);
      const hasNotes =
        (entry.reason || "").trim() || (entry.improvements || "").trim();
      if (!hasNotes) {
        setTooltip(null);
        return;
      }

      const chartEl = (event.currentTarget as SVGElement).ownerSVGElement
        ?.parentElement;
      if (!chartEl) return;
      const rect = chartEl.getBoundingClientRect();
      let left = event.clientX - rect.left + 12;
      let top = event.clientY - rect.top + 12;
      setTooltip({ areaId, left, top });
    }

    return (
      <svg
        className="wheel-svg"
        viewBox={"0 0 " + size + " " + size}
        role="img"
        aria-label="Wheel of Life"
      >
        {rings}
        {hits}
        {wedges}
        <circle className="wheel-rim" cx={cx} cy={cy} r={outerR} />
        {labels}
        {badges}
      </svg>
    );
  }, [areaScores, selectedAreaId, getWheelEntry]);

  const tooltipContent = useMemo(() => {
    if (!tooltip) return null;
    const area = LIFE_AREAS.find((item) => item.id === tooltip.areaId);
    if (!area) return null;
    const entry = getWheelEntry(tooltip.areaId);
    const reasonText = (entry.reason || "").trim();
    const improvementsText = (entry.improvements || "").trim();
    if (!reasonText && !improvementsText) return null;

    return (
      <div
        className="wheel-tooltip"
        role="tooltip"
        style={{ left: tooltip.left, top: tooltip.top }}
      >
        <p className="wheel-tooltip-title">{area.label}</p>
        {reasonText ? (
          <p className="wheel-tooltip-block">
            <strong>Score reason</strong>
            <br />
            {reasonText}
          </p>
        ) : null}
        {improvementsText ? (
          <p className="wheel-tooltip-block">
            <strong>Improvements</strong>
            <br />
            {improvementsText}
          </p>
        ) : null}
      </div>
    );
  }, [tooltip, getWheelEntry]);

  if (loadError) {
    return <p className="error">{loadError}</p>;
  }

  if (!areaScores) {
    return <p className="page-intro">Loading wheel…</p>;
  }

  const selectedArea = LIFE_AREAS.find((item) => item.id === selectedAreaId);

  return (
    <>
      <header className="quests-page-header">
        <h1>Wheel of Life</h1>
      </header>
      <p className="page-intro">
        Click a segment to focus that area and set your score (1–10).
      </p>
      <div className="wheel-chart">
        {chart}
        {tooltipContent}
      </div>
      {selectedArea ? (
        <div className="wheel-editor">
          <p className="wheel-editor-label">{selectedArea.label}</p>
          <div className="wheel-editor-controls">
            <button
              type="button"
              aria-label="Decrease score"
              onClick={() =>
                setEditorScore((s) => clampWheelScore(s - 1))
              }
            >
              −
            </button>
            <strong>{editorScore}</strong>
            <button
              type="button"
              aria-label="Increase score"
              onClick={() =>
                setEditorScore((s) => clampWheelScore(s + 1))
              }
            >
              +
            </button>
          </div>
          <label className="field">
            <span>What resulted in the score</span>
            <textarea
              rows={3}
              maxLength={400}
              placeholder="What led to this score?"
              value={editorReason}
              onChange={(e) => setEditorReason(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Improvements I need to make</span>
            <textarea
              rows={3}
              maxLength={400}
              placeholder="What will you improve?"
              value={editorImprovements}
              onChange={(e) => setEditorImprovements(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="create-btn"
            onClick={saveSelectedAreaScore}
          >
            Save
          </button>
          {saveError ? <p className="error">{saveError}</p> : null}
        </div>
      ) : null}
    </>
  );
}
