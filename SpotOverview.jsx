import { useMemo } from "react";

/**
 * SpotOverview — 7-day multi-spot homepage grid for KiteSpot NL
 *
 * Props:
 *   spots : array of spot objects:
 *     {
 *       name: string,                   — e.g. "IJmuiden"
 *       days: array of 7 day objects:
 *         {
 *           date: string,               — e.g. "2026-04-10"
 *           hours: number[],            — 6 wind values for [06, 09, 12, 15, 18, 21] in knots
 *         }
 *     }
 *   threshold   : number — min knots for kiteable (default 17)
 *   yMax        : number — max knots for bar scaling (default 35)
 *
 * The component derives:
 *   - Bar heights & colors from wind values
 *   - Session pills (kiteable window, direction, avg wind) when wind >= threshold
 *   - "today" highlight on the first column
 *
 * For session pills to show direction, add an optional `dir` field to each day:
 *   { date, hours, dir: "SW" }
 *
 * Dependencies: none (pure React, inline styles)
 */

// ── Wind band colors ──

const BAND_COLORS = [
  { min: 29, color: "#085041" },
  { min: 22, color: "#1D9E75" },
  { min: 17, color: "#5DCAA5" },
  { min: 10, color: "#E1F5EE" },
  { min: 0,  color: "#D3D1C7" },
];

function bandColor(kn) {
  for (const b of BAND_COLORS) {
    if (kn >= b.min) return b.color;
  }
  return "#D3D1C7";
}

// ── Date formatting ──

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    label: `${DAY_NAMES[d.getDay()]} ${d.getDate()}`,
    month: MONTH_NAMES[d.getMonth()],
  };
}

function isToday(dateStr) {
  const today = new Date();
  const d = new Date(dateStr + "T00:00:00");
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

// ── Session detection ──

const HOUR_LABELS = [6, 9, 12, 15, 18, 21];

function deriveSession(hours, threshold, dir) {
  const rideable = [];
  hours.forEach((kn, i) => {
    if (kn >= threshold) rideable.push(i);
  });

  if (rideable.length === 0) {
    const peak = Math.round(Math.max(...hours));
    return { kiteable: false, peak };
  }

  const firstIdx = rideable[0];
  const lastIdx = rideable[rideable.length - 1];
  const from = String(HOUR_LABELS[firstIdx]).padStart(2, "0");
  const to = String(HOUR_LABELS[lastIdx]).padStart(2, "0");
  const avg = Math.round(
    rideable.reduce((sum, i) => sum + hours[i], 0) / rideable.length
  );

  return {
    kiteable: true,
    from: `${from}`,
    to: `${to}`,
    avg,
    dir: dir || "",
  };
}

// ── Sub-components ──

function MiniBarChart({ hours, yMax }) {
  return (
    <div style={styles.barWrap}>
      {hours.map((kn, i) => {
        const pct = Math.max(8, Math.min(100, (kn / yMax) * 100));
        return (
          <div
            key={i}
            style={{
              ...styles.bar,
              height: `${Math.round(pct)}%`,
              background: bandColor(kn),
            }}
          />
        );
      })}
    </div>
  );
}

function SessionPill({ session }) {
  if (!session.kiteable) {
    return <div style={styles.noWind}>{session.peak} kn</div>;
  }
  const dirStr = session.dir ? ` ${session.dir}` : "";
  return (
    <div style={styles.pill}>
      {session.from}–{session.to}h{dirStr} {session.avg} kn
    </div>
  );
}

function DayCell({ hours, threshold, yMax, dir }) {
  const session = useMemo(
    () => deriveSession(hours, threshold, dir),
    [hours, threshold, dir]
  );

  return (
    <div style={styles.dayCell}>
      <MiniBarChart hours={hours} yMax={yMax} />
      <SessionPill session={session} />
    </div>
  );
}

// ── Legend ──

function Legend() {
  const items = [
    { color: "#D3D1C7", label: "<10 kn" },
    { color: "#E1F5EE", label: "10-16" },
    { color: "#5DCAA5", label: "17-21" },
    { color: "#1D9E75", label: "22-28" },
    { color: "#085041", label: "29+" },
  ];

  return (
    <div style={styles.legend}>
      {items.map((item) => (
        <div key={item.label} style={styles.legendItem}>
          <div style={{ ...styles.legendSwatch, background: item.color }} />
          {item.label}
        </div>
      ))}
      <div style={styles.legendNote}>06:00 – 21:00 per day</div>
    </div>
  );
}

// ── Main component ──

export default function SpotOverview({
  spots = [],
  threshold = 17,
  yMax = 35,
}) {
  // Derive day count from first spot
  const dayCount = spots.length > 0 ? spots[0].days.length : 7;

  return (
    <div style={styles.root}>
      <Legend />

      {/* Day headers */}
      <div style={gridStyle(dayCount)}>
        <div />
        {spots.length > 0 &&
          spots[0].days.map((day, i) => {
            const { label } = formatDate(day.date);
            const today = isToday(day.date);
            return (
              <div
                key={day.date}
                style={{
                  ...styles.dayHeader,
                  color: today ? "#0F6E56" : undefined,
                }}
              >
                {label}
                {today && <span style={styles.todaySub}>today</span>}
              </div>
            );
          })}
      </div>

      {/* Spot rows */}
      {spots.map((spot, si) => (
        <div
          key={spot.name}
          style={{
            ...gridStyle(dayCount),
            ...styles.spotRow,
            ...(si === spots.length - 1 ? styles.spotRowLast : {}),
          }}
        >
          <div style={styles.spotName}>{spot.name}</div>
          {spot.days.map((day) => (
            <DayCell
              key={day.date}
              hours={day.hours}
              threshold={threshold}
              yMax={yMax}
              dir={day.dir}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Styles ──

function gridStyle(cols) {
  return {
    display: "grid",
    gridTemplateColumns: `88px repeat(${cols}, minmax(0, 1fr))`,
    gap: 0,
  };
}

const styles = {
  root: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  legend: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 12,
    alignItems: "center",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendNote: {
    marginLeft: "auto",
    fontSize: 11,
    color: "#9ca3af",
  },
  dayHeader: {
    fontSize: 13,
    fontWeight: 500,
    textAlign: "center",
    padding: "6px 0",
    color: "#6b7280",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  todaySub: {
    fontSize: 11,
    fontWeight: 400,
    color: "#9ca3af",
  },
  spotRow: {
    borderTop: "0.5px solid #e5e7eb",
  },
  spotRowLast: {
    borderBottom: "0.5px solid #e5e7eb",
  },
  spotName: {
    fontSize: 13,
    fontWeight: 500,
    padding: "10px 8px 10px 0",
    display: "flex",
    alignItems: "center",
  },
  dayCell: {
    padding: "6px 2px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minHeight: 56,
    justifyContent: "center",
    borderLeft: "0.5px solid #e5e7eb",
  },
  barWrap: {
    display: "flex",
    gap: 1,
    height: 24,
    alignItems: "flex-end",
    padding: "0 3px",
  },
  bar: {
    flex: 1,
    borderRadius: "2px 2px 0 0",
    minWidth: 0,
  },
  pill: {
    fontSize: 10,
    padding: "2px 5px",
    borderRadius: 4,
    background: "#E1F5EE",
    color: "#085041",
    width: "fit-content",
    margin: "0 3px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "calc(100% - 6px)",
  },
  noWind: {
    fontSize: 10,
    color: "#9ca3af",
    padding: "0 3px",
  },
};
