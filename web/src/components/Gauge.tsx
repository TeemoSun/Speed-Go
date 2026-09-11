import React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

interface GaugeProps {
  value: number; // Current Mbps
  label: string;
  stage: "idle" | "ping" | "download" | "upload" | "finished";
  isTesting: boolean;
}

const scalePoints = [
  { val: 0, pct: 0, label: "0" },
  { val: 5, pct: 0.11, label: "5" },
  { val: 10, pct: 0.22, label: "10" },
  { val: 50, pct: 0.37, label: "50" },
  { val: 100, pct: 0.50, label: "100" },
  { val: 250, pct: 0.63, label: "250" },
  { val: 500, pct: 0.76, label: "500" },
  { val: 750, pct: 0.88, label: "750" },
  { val: 1000, pct: 1.00, label: "1000" },
];

function valToPct(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1000) return 1;
  for (let i = 0; i < scalePoints.length - 1; i++) {
    const p1 = scalePoints[i];
    const p2 = scalePoints[i + 1];
    if (v >= p1.val && v <= p2.val) {
      const ratio = (v - p1.val) / (p2.val - p1.val);
      return p1.pct + ratio * (p2.pct - p1.pct);
    }
  }
  return 1;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  label,
  stage,
  isTesting,
}) => {
  const cx = 190;
  const cy = 190;
  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (circumference * 240) / 360;

  const pct = valToPct(value);
  const strokeDashoffset = arcLength * (1 - pct);
  const needleAngle = -120 + pct * 240;

  // Dynamic color theme according to stage and speed
  let gradientStart = "#06b6d4"; // cyan
  let gradientEnd = "#3b82f6";   // blue
  if (stage === "download") {
    if (value > 500) {
      gradientStart = "#8b5cf6"; // purple
      gradientEnd = "#ec4899";   // pink
    } else {
      gradientStart = "#10b981"; // emerald
      gradientEnd = "#06b6d4";   // cyan
    }
  } else if (stage === "upload") {
    gradientStart = "#f59e0b"; // amber
    gradientEnd = "#ef4444";   // red
  }

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-[420px] mx-auto">
      <svg
        viewBox="0 0 380 300"
        className="w-full h-auto drop-shadow-xl overflow-visible"
      >
        <defs>
          <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
          <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer scale track background */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-zinc-700/25 dark:text-white/10"
          strokeWidth="12"
          strokeDasharray={`${arcLength} ${circumference}`}
          transform={`rotate(150 ${cx} ${cy})`}
          strokeLinecap="round"
        />

        {/* Active speed colored progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="url(#meterGradient)"
          strokeWidth="12"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(150 ${cx} ${cy})`}
          strokeLinecap="round"
          filter={isTesting ? "url(#gaugeGlow)" : undefined}
          className="transition-all duration-200 ease-out"
        />

        {/* Scale ticks and numeric labels */}
        {scalePoints.map((pt) => {
          const angle = -120 + pt.pct * 240;
          const rad = (angle * Math.PI) / 180;
          const sin = Math.sin(rad);
          const cos = Math.cos(rad);

          // Tick mark
          const x1 = cx + (radius - 12) * sin;
          const y1 = cy - (radius - 12) * cos;
          const x2 = cx + (radius + 8) * sin;
          const y2 = cy - (radius + 8) * cos;

          // Text label
          const tx = cx + (radius - 30) * sin;
          const ty = cy - (radius - 30) * cos + 4;

          return (
            <g key={pt.val}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className="stroke-zinc-400/40 dark:stroke-white/30"
                strokeWidth={pt.val === 0 || pt.val === 100 || pt.val === 500 || pt.val === 1000 ? "2" : "1"}
              />
              <text
                x={tx}
                y={ty}
                textAnchor="middle"
                className="font-numeric text-[11px] font-semibold fill-zinc-500 dark:fill-zinc-400"
              >
                {pt.label}
              </text>
            </g>
          );
        })}

        {/* Intermediate small ticks for realism */}
        {[0.05, 0.16, 0.29, 0.43, 0.56, 0.70, 0.82, 0.94].map((subPct) => {
          const angle = -120 + subPct * 240;
          const rad = (angle * Math.PI) / 180;
          const sin = Math.sin(rad);
          const cos = Math.cos(rad);
          const x1 = cx + (radius - 8) * sin;
          const y1 = cy - (radius - 8) * cos;
          const x2 = cx + (radius + 4) * sin;
          const y2 = cy - (radius + 4) * cos;
          return (
            <line
              key={subPct}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className="stroke-zinc-400/20 dark:stroke-white/15"
              strokeWidth="1"
            />
          );
        })}

        {/* Smooth Needle */}
        <g
          transform={`rotate(${needleAngle} ${cx} ${cy})`}
          className="transition-transform duration-200 ease-out"
        >
          <polygon
            points={`${cx - 3.5},${cy} ${cx + 3.5},${cy} ${cx + 1},${cy - 105} ${cx - 1},${cy - 105}`}
            className="fill-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
          />
          <circle
            cx={cx}
            cy={cy}
            r="8"
            className="fill-zinc-900 stroke-cyan-400 stroke-2"
          />
          <circle
            cx={cx}
            cy={cy}
            r="3.5"
            className="fill-cyan-400"
          />
        </g>
      </svg>

      {/* Digital Readout below needle pivot */}
      <div className="flex flex-col items-center -mt-16 pointer-events-none z-10">
        <div className="flex items-baseline space-x-1.5">
          <span className="text-4xl md:text-5xl font-black font-numeric tracking-tight text-zinc-900 dark:text-white drop-shadow-sm">
            {value > 0 ? value.toFixed(value >= 100 ? 1 : 2) : "--"}
          </span>
        </div>
        <div className="flex items-center space-x-1 mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {stage === "upload" ? (
            <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span>Mbps</span>
        </div>

        {/* Phase subtitle */}
        <div className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center space-x-1.5">
          {isTesting && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          )}
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
};
