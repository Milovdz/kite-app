import { useEffect, useRef, useMemo } from "react";
import Chart from "chart.js/auto";

/**
 * WindGraph — Today's forecast vs actual wind chart for KiteSpot NL
 *
 * Props:
 *   spotName       : string — e.g. "IJmuiden"
 *   currentWind    : number — latest actual wind reading in knots
 *   currentGust    : number — latest actual gust reading in knots
 *   currentDirDeg  : number — current wind direction in degrees (0=N, 180=S, 225=SW)
 *   threshold      : number — kiteable wind threshold in knots (default 17)
 *   yMax           : number — y-axis max (default 40)
 *   forecastWind   : number[] — 24 values (index 0 = 00:00, index 23 = 23:00), knots
 *   forecastGust   : number[] — 24 values, knots
 *   actualWind     : (number|null)[] — 24 values, null for future hours
 *   actualGust     : (number|null)[] — 24 values, null for future hours
 *   nowIndex       : number — current hour index (0-23), used for "Now" marker
 *
 * Dependencies:
 *   chart.js >= 4.x — install with `npm install chart.js`
 *
 * Usage:
 *   import WindGraph from "./WindGraph";
 *   <WindGraph
 *     spotName="IJmuiden"
 *     currentWind={24} currentGust={31} currentDirDeg={225}
 *     forecastWind={[8, 9, ...]} forecastGust={[12, 13, ...]}
 *     actualWind={[8, 8, ...]}   actualGust={[11, 11, ...]}
 *     nowIndex={17}
 *   />
 */

// ── Helpers ──

function degreesToCompass(deg) {
  const dirs = [
    "N","NNE","NE","ENE","E","ESE","SE","SSE",
    "S","SSW","SW","WSW","W","WNW","NW","NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

function windBandColor(kn) {
  if (kn >= 22) return "#1D9E75";
  if (kn >= 17) return "#5DCAA5";
  return "#888780";
}

// ── Chart.js Plugin: threshold zones + "now" line ──

function makeZonesPlugin(threshold, nowIndex, isDark) {
  return {
    id: "zones",
    beforeDatasetsDraw(chart) {
      const {
        ctx,
        chartArea: { left, right, top, bottom },
        scales: { y, x },
      } = chart;

      // Kiteable zone fill (above threshold)
      const threshY = y.getPixelForValue(threshold);
      ctx.fillStyle = isDark
        ? "rgba(29,158,117,0.08)"
        : "rgba(29,158,117,0.08)";
      ctx.fillRect(left, top, right - left, threshY - top);

      // Threshold dashed line
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = isDark
        ? "rgba(29,158,117,0.3)"
        : "rgba(29,158,117,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, threshY);
      ctx.lineTo(right, threshY);
      ctx.stroke();
      ctx.restore();

      // Threshold label
      ctx.font = "500 11px sans-serif";
      ctx.fillStyle = isDark
        ? "rgba(29,158,117,0.5)"
        : "rgba(29,158,117,0.6)";
      ctx.textAlign = "left";
      ctx.fillText(`${threshold} kn`, left + 6, threshY - 5);

      // "Now" vertical dashed line
      if (nowIndex != null) {
        const nowX = x.getPixelForValue(nowIndex);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isDark
          ? "rgba(255,255,255,0.7)"
          : "rgba(0,0,0,0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(nowX, top);
        ctx.lineTo(nowX, bottom);
        ctx.stroke();
        ctx.restore();

        ctx.font = "600 12px sans-serif";
        ctx.fillStyle = isDark
          ? "rgba(255,255,255,0.85)"
          : "rgba(0,0,0,0.7)";
        ctx.textAlign = "center";
        ctx.fillText("Now", nowX, top - 6);
      }
    },
  };
}

// ── Chart.js Plugin: fill between wind & gust lines ──

function makeFillPlugin(isDark) {
  return {
    id: "fillBetween",
    beforeDatasetsDraw(chart) {
      const { ctx } = chart;

      function fillArea(windDsIdx, gustDsIdx, color) {
        const windData = chart.data.datasets[windDsIdx].data;
        const gustData = chart.data.datasets[gustDsIdx].data;
        const windMeta = chart.getDatasetMeta(windDsIdx);
        const gustMeta = chart.getDatasetMeta(gustDsIdx);

        const windPts = [];
        const gustPts = [];
        windData.forEach((v, i) => {
          if (v !== null) {
            windPts.push(windMeta.data[i]);
            gustPts.push(gustMeta.data[i]);
          }
        });

        if (windPts.length < 2) return;

        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        gustPts.forEach((p, i) =>
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
        );
        for (let i = windPts.length - 1; i >= 0; i--) {
          ctx.lineTo(windPts[i].x, windPts[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Forecast fill (wind → gust): datasets 0 & 1
      fillArea(
        0,
        1,
        isDark ? "rgba(212,83,126,0.1)" : "rgba(212,83,126,0.08)"
      );
      // Actual fill (wind → gust): datasets 2 & 3
      fillArea(
        2,
        3,
        isDark ? "rgba(29,158,117,0.12)" : "rgba(29,158,117,0.1)"
      );
    },
  };
}

// ── 10-minute time grid (00:00 … 23:50, 144 slots) ──

const TIME_LABELS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 10) {
    TIME_LABELS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

// Map a "HH:MM" string to its slot index in TIME_LABELS
function timeToSlot(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 6 + Math.round(m / 10);
}

// ── Colors ──

const COLORS = {
  forecastWind: "#D4537E",
  forecastGust: "rgba(212,83,126,0.4)",
  actualWind: "#1D9E75",
  actualGust: "rgba(29,158,117,0.4)",
};

const ZONE_ARROW_COLOR = {
  onshore:      '#5DCAA5',
  crossOnshore: '#5DCAA5',
  sideShore:    '#f59e0b',
  offshore:     '#ef4444',
};

const ZONE_DISPLAY = {
  onshore:      'Onshore ✓',
  crossOnshore: 'Cross-onshore ✓',
  sideShore:    'Side-shore ✓',
  offshore:     'Offshore ⚠',
};

// ── Unique instance counter (avoids Chart.js duplicate plugin id errors) ──

let _instanceCounter = 0;

// ── Component ──

export default function WindGraph({
  spotName = "IJmuiden",
  currentWind,
  currentGust,
  currentDirDeg = 225,
  threshold = 17,
  yMax = 40,
  windZone = 'onshore',
  forecastWind = [],
  forecastGust = [],
  actuals = [],
  nowTime,
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const instanceId = useRef(++_instanceCounter);

  const compassDir = useMemo(
    () => degreesToCompass(currentDirDeg),
    [currentDirDeg]
  );
  const badgeColor = useMemo(
    () => windBandColor(currentWind),
    [currentWind]
  );

  // Detect dark mode
  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Build 144-slot arrays (10-min resolution)
    const forecastWindSlots = Array(144).fill(null);
    const forecastGustSlots = Array(144).fill(null);
    forecastWind.forEach((v, h) => { forecastWindSlots[h * 6] = v; });
    forecastGust.forEach((v, h) => { forecastGustSlots[h * 6] = v; });

    const actualWindSlots = Array(144).fill(null);
    const actualGustSlots = Array(144).fill(null);
    for (const obs of actuals) {
      const slot = timeToSlot(obs.time);
      actualWindSlots[slot] = obs.windKn;
      actualGustSlots[slot] = obs.gustKn;
    }

    const nowSlot = nowTime ? timeToSlot(nowTime) : null;

    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const tickColor = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)";

    Chart.defaults.color = tickColor;

    const id = instanceId.current;
    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      plugins: [
        { ...makeZonesPlugin(threshold, nowSlot, isDark), id: `zones-${id}` },
        { ...makeFillPlugin(isDark), id: `fillBetween-${id}` },
      ],
      data: {
        labels: TIME_LABELS,
        datasets: [
          {
            label: "Forecast wind",
            data: forecastWindSlots,
            borderColor: COLORS.forecastWind,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.4,
            fill: false,
            spanGaps: true,
            order: 2,
          },
          {
            label: "Forecast gust",
            data: forecastGustSlots,
            borderColor: COLORS.forecastGust,
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 3,
            tension: 0.4,
            borderDash: [4, 3],
            fill: false,
            spanGaps: true,
            order: 3,
          },
          {
            label: "Actual wind",
            data: actualWindSlots,
            borderColor: COLORS.actualWind,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.4,
            fill: false,
            spanGaps: false,
            order: 0,
          },
          {
            label: "Actual gust",
            data: actualGustSlots,
            borderColor: COLORS.actualGust,
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 3,
            tension: 0.4,
            borderDash: [4, 3],
            fill: false,
            spanGaps: false,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? "#2C2C2A" : "#fff",
            titleColor: isDark ? "#fff" : "#1a1a1a",
            bodyColor: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y;
                if (v === null || isNaN(v)) return null;
                const names = ["Forecast", "Forecast gust", "Actual", "Actual gust"];
                return `${names[ctx.datasetIndex]}: ${Math.round(v)} kn`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: gridColor, lineWidth: 1 },
            ticks: {
              color: "#374151",
              font: { size: 12, weight: "500" },
              autoSkip: false,
              maxRotation: 0,
              callback: function (_val, idx) {
                // Show label every 3 hours (every 18 slots)
                return idx % 18 === 0 ? TIME_LABELS[idx] : "";
              },
            },
            border: { display: false },
          },
          y: {
            min: 0,
            max: yMax,
            grid: { color: gridColor, lineWidth: 1 },
            ticks: {
              color: "#374151",
              font: { size: 12, weight: "500" },
              stepSize: 5,
              callback: (v) => `${v} kn`,
            },
            border: { display: false },
            afterFit: (axis) => { axis.width = 56; },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [
    forecastWind,
    forecastGust,
    actuals,
    nowTime,
    threshold,
    yMax,
    isDark,
  ]);

  return (
    <div style={styles.root}>
      {/* Header: current reading + direction */}
      <div style={styles.header}>
        <div>
          <div style={styles.spotName}>{spotName}</div>
          <div style={styles.heroRow}>
            <div style={{ ...styles.badge, background: badgeColor }}>
              {currentWind}
            </div>
            <span style={styles.unit}>kn</span>
            <span style={styles.gustNum}>G{currentGust}</span>
            <span style={styles.unit}>kn</span>
          </div>
        </div>
        <div style={styles.dirBox}>
          <svg width={20} height={20} viewBox="0 0 20 20">
            <path
              d="M10 2 L14 10 L11 9 L11 18 L9 18 L9 9 L6 10 Z"
              fill={windZone === 'onshore' || windZone === 'crossOnshore' ? ZONE_ARROW_COLOR.onshore : '#94a3b8'}
              transform={`rotate(${currentDirDeg + 180}, 10, 10)`}
            />
          </svg>
          <span style={{ ...styles.dirLabel, color: windZone === 'onshore' || windZone === 'crossOnshore' ? ZONE_ARROW_COLOR.onshore : '#94a3b8' }}>
            {compassDir} · {ZONE_DISPLAY[windZone]}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <LegendItem color={COLORS.actualWind} label="Actual wind" />
        <LegendItem
          color={COLORS.actualWind}
          label="Actual gust"
          opacity={0.4}
        />
        <LegendItem color={COLORS.forecastWind} label="Forecast wind" />
        <LegendItem
          color={COLORS.forecastWind}
          label="Forecast gust"
          opacity={0.4}
        />
      </div>

      {/* Chart */}
      <div style={styles.chartWrap}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

// ── Legend sub-component ──

function LegendItem({ color, label, opacity = 1 }) {
  return (
    <span style={styles.legendItem}>
      <span
        style={{
          width: 12,
          height: 2.5,
          borderRadius: 1,
          background: color,
          opacity,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

// ── Styles ──

const styles = {
  root: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    width: "100%",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  spotName: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  heroRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  badge: {
    color: "#fff",
    fontSize: 28,
    fontWeight: 500,
    padding: "4px 12px",
    borderRadius: 6,
    lineHeight: 1.2,
  },
  unit: {
    fontSize: 13,
    color: "#6b7280",
  },
  gustNum: {
    fontSize: 18,
    fontWeight: 500,
  },
  dirBox: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  dirLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  legend: {
    display: "flex",
    gap: 16,
    marginBottom: 12,
    flexWrap: "wrap",
    fontSize: 12,
    color: "#6b7280",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  chartWrap: {
    position: "relative",
    width: "100%",
    height: 280,
  },
};
