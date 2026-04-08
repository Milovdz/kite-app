import { useMemo } from "react";

/**
 * KiteSpot NL — Single Day Forecast Card
 *
 * Props:
 *   date        : string — e.g. "2026-04-08"
 *   spotName    : string — e.g. "IJmuiden"
 *   slots       : array of 6 objects (06, 09, 12, 15, 18, 21) each with:
 *                   { hour, windKn, gustKn, dirDeg, waveM, tempC, rainMm }
 *   tides       : array of 3-4 objects sorted by time:
 *                   { time: "06:12", heightM: 0.3, type: "low" | "high" }
 *   rideableMin : number — minimum kn to be rideable (default 16)
 *   pumpingMin  : number — minimum kn to be "pumping" (default 22)
 */

const PERIODS = ["morning", "", "afternoon", "", "evening", ""];

const COLORS = {
  tooLight:  { bg: "var(--bg-muted)",  text: "var(--text-primary)" },
  light:     { bg: "#E1F5EE",          text: "#085041" },
  rideable:  { bg: "#5DCAA5",          text: "#04342C",  label: "#0F6E56" },
  pumping:   { bg: "#1D9E75",          text: "#E1F5EE",  label: "#E1F5EE", gust: "#9FE1CB" },
  strong:    { bg: "#085041",          text: "#E1F5EE",  label: "#9FE1CB", gust: "#5DCAA5" },
};

function windBand(kn, rideableMin, pumpingMin) {
  if (kn >= 29) return "strong";
  if (kn >= pumpingMin) return "pumping";
  if (kn >= rideableMin) return "rideable";
  if (kn >= 10) return "light";
  return "tooLight";
}

function bandLabel(band) {
  if (band === "rideable") return "RIDE";
  if (band === "pumping") return "PUMP";
  if (band === "strong") return "STRONG";
  return null;
}

function formatDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.toLocaleDateString("en-GB", { weekday: "long" });
  const short = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return { day, short };
}

/* ── Direction Arrow ── */
function WindArrow({ deg, size = 18, color = "var(--text-secondary)" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      style={{ display: "block", margin: "0 auto" }}
    >
      <path
        d="M10 2 L14 10 L11 9 L11 18 L9 18 L9 9 L6 10 Z"
        fill={color}
        transform={`rotate(${deg}, 10, 10)`}
      />
    </svg>
  );
}

/* ── Tide Curve ── */
function TideCurve({ tides }) {
  if (!tides || tides.length === 0) return null;

  // Map tide times to x-positions within a 06:00–24:00 window (18h span)
  const timeToX = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    const hours = h + m / 60;
    // Clamp to 0–400 over 00:00–24:00 range
    return Math.max(0, Math.min(400, (hours / 24) * 400));
  };

  const yHigh = 8;
  const yLow = 42;

  const points = tides.map((t) => ({
    x: timeToX(t.time),
    y: t.type === "high" ? yHigh : yLow,
    ...t,
  }));

  // Build a smooth cubic bezier path through the tide points
  let pathD = `M0,${points[0].type === "low" ? yLow : yHigh}`;
  points.forEach((p, i) => {
    const prev = i === 0 ? { x: 0, y: points[0].type === "low" ? yLow : yHigh } : points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    pathD += ` C${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
  });
  // Extend to end
  const last = points[points.length - 1];
  const endY = last.type === "high" ? yLow : yHigh;
  const cpxEnd = (last.x + 400) / 2;
  pathD += ` C${cpxEnd},${last.y} ${cpxEnd},${endY} 400,${endY}`;

  const fillD = pathD + " L400,52 L0,52 Z";

  return (
    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "0.5px solid var(--border)" }}>
      <div style={{
        fontSize: 10, color: "var(--text-tertiary)",
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
      }}>
        Tide
      </div>
      <div style={{ position: "relative", height: 52 }}>
        <svg
          width="100%"
          height="52"
          viewBox="0 0 400 52"
          preserveAspectRatio="none"
          style={{ display: "block" }}
        >
          <path d={pathD} fill="none" stroke="#85B7EB" strokeWidth="2" opacity="0.5" />
          <path d={fillD} fill="#85B7EB" opacity="0.08" />
        </svg>
        {points.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(p.x / 400) * 100}%`,
              top: p.type === "high" ? 0 : 34,
              transform: i === 0 ? "none" : i === points.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
              textAlign: i === 0 ? "left" : i === points.length - 1 ? "right" : "center",
            }}
          >
            {p.type === "high" ? (
              <>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--tide-accent)" }}>
                  H {p.heightM.toFixed(1)}m
                </div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{p.time}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{p.time}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--tide-accent)" }}>
                  L {p.heightM.toFixed(1)}m
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function ForecastDay({
  date,
  spotName = "IJmuiden",
  slots = [],
  tides = [],
  rideableMin = 16,
  pumpingMin = 22,
}) {
  const { day, short } = useMemo(() => formatDay(date), [date]);

  // Derive kiteable window from slots
  const kiteableWindow = useMemo(() => {
    const rideable = slots.filter((s) => s.windKn >= rideableMin);
    if (rideable.length === 0) return null;
    const first = rideable[0];
    const last = rideable[rideable.length - 1];
    const avgWind = Math.round(rideable.reduce((a, s) => a + s.windKn, 0) / rideable.length);
    const maxWave = Math.max(...rideable.map((s) => s.waveM));
    const minWave = Math.min(...rideable.map((s) => s.waveM));
    const dir = degreesToCompass(first.dirDeg);
    const waveStr = minWave === maxWave ? `${minWave}m` : `${minWave}-${maxWave}m`;
    return {
      from: `${String(first.hour).padStart(2, "0")}:00`,
      to: `${String(last.hour).padStart(2, "0")}:00`,
      dir,
      avgWind,
      waveStr,
    };
  }, [slots, rideableMin]);

  return (
    <div style={rootStyle}>
      {/* Header */}
      <div style={{ fontSize: 15, fontWeight: 500, display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        {day}
        <span style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 400 }}>
          {short} · {spotName}
        </span>
      </div>

      {/* Session banner */}
      {kiteableWindow && (
        <div style={bannerStyle}>
          ▸ Kiteable {kiteableWindow.from} – {kiteableWindow.to} · {kiteableWindow.dir}{" "}
          {kiteableWindow.avgWind} kn · {kiteableWindow.waveStr}
        </div>
      )}

      {/* Period labels */}
      <div style={gridStyle}>
        {PERIODS.map((p, i) => (
          <div key={i} style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", paddingBottom: 2 }}>
            {p}
          </div>
        ))}
      </div>

      {/* Time labels */}
      <div style={{ ...gridStyle, marginBottom: 3 }}>
        {slots.map((s) => (
          <div key={s.hour} style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", padding: "2px 0" }}>
            {String(s.hour).padStart(2, "0")}
          </div>
        ))}
      </div>

      {/* Wind tiles */}
      <div style={{ ...gridStyle, marginBottom: 2 }}>
        {slots.map((s) => {
          const band = windBand(s.windKn, rideableMin, pumpingMin);
          const c = COLORS[band];
          const label = bandLabel(band);
          return (
            <div key={s.hour} style={{ ...tileStyle, background: c.bg }}>
              <span style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.1, color: c.text }}>{s.windKn}</span>
              {label && (
                <span style={{ fontSize: 10, fontWeight: 500, color: c.label, marginTop: 2 }}>{label}</span>
              )}
              <span style={{ fontSize: 11, color: c.gust || "var(--text-tertiary)", marginTop: 1 }}>
                G{s.gustKn}
              </span>
            </div>
          );
        })}
      </div>

      {/* Direction arrows */}
      <div style={gridStyle}>
        {slots.map((s) => (
          <div key={s.hour} style={{ textAlign: "center", padding: "4px 0" }}>
            <WindArrow deg={s.dirDeg} />
          </div>
        ))}
      </div>

      {/* Wave */}
      <div style={{ ...gridStyle, marginTop: 8, paddingTop: 8, borderTop: "0.5px solid var(--border)" }}>
        {slots.map((s) => (
          <div key={s.hour} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>wave</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.waveM}m</div>
          </div>
        ))}
      </div>

      {/* Temp */}
      <div style={{ ...gridStyle, marginTop: 6 }}>
        {slots.map((s) => (
          <div key={s.hour} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>temp</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{Math.round(s.tempC)}°</div>
          </div>
        ))}
      </div>

      {/* Rain — only show cells with precipitation */}
      <div style={{ ...gridStyle, marginTop: 6 }}>
        {slots.map((s) => (
          <div key={s.hour} style={{ textAlign: "center" }}>
            {s.rainMm > 0 ? (
              <>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>rain</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  <span style={precipDotStyle} />
                  {s.rainMm}
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>

      {/* Tide */}
      <TideCurve tides={tides} />
    </div>
  );
}

/* ── Helpers ── */
function degreesToCompass(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

/* ── Styles ── */
const rootStyle = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  maxWidth: 520,
  padding: "0.5rem 0",
  // Map CSS vars to simpler tokens — adapt these to your app's theme
  "--bg-muted": "#f3f4f6",
  "--text-primary": "#1a1a1a",
  "--text-secondary": "#6b7280",
  "--text-tertiary": "#9ca3af",
  "--border": "#e5e7eb",
  "--tide-accent": "#185FA5",
  color: "var(--text-primary)",
};

const bannerStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "#0F6E56",
  background: "#E1F5EE",
  padding: "6px 12px",
  borderRadius: 8,
  marginBottom: 12,
  width: "fit-content",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: 3,
};

const tileStyle = {
  borderRadius: 6,
  textAlign: "center",
  padding: "8px 2px",
  minHeight: 52,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  border: "0.5px solid rgba(0,0,0,0.06)",
};

const precipDotStyle = {
  display: "inline-block",
  width: 5,
  height: 5,
  borderRadius: "50%",
  background: "#378ADD",
  marginRight: 2,
  verticalAlign: "middle",
};
