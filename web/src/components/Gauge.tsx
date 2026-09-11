import React from "react";

interface GaugeProps {
  value: number; // Current Mbps
  maxValue?: number; // Scale maximum (e.g. 100 or 1000)
  label: string;
  stage: "idle" | "ping" | "download" | "upload" | "finished";
  isTesting: boolean;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  maxValue = 1000,
  label,
  stage,
  isTesting,
}) => {
  // 240-degree arc gauge
  const radius = 135;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  // Use 240 degrees out of 360
  const arcLength = (circumference * 240) / 360;

  // Logarithmic-like non-linear scale so small speeds (e.g. 10M) and large speeds (1000M) both look great
  const progressPercent = Math.min(Math.max(value / maxValue, 0), 1);
  const strokeDashoffset = arcLength - arcLength * progressPercent;

  // Color theme according to stage and speed
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
    <div className="relative flex flex-col items-center justify-center p-6 select-none">
      <svg
        width="340"
        height="300"
        viewBox="0 0 340 300"
        className="transform -rotate-120 drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Track */}
        <circle
          cx="170"
          cy="170"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />

        {/* Active Animated Arc */}
        <circle
          cx="170"
          cy="170"
          r={radius}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter={isTesting ? "url(#glow)" : undefined}
          className="transition-all duration-150 ease-out"
        />
      </svg>

      {/* Center Digital Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 pointer-events-none">
        <span className="text-xs tracking-widest font-semibold uppercase text-zinc-400 mb-1">
          {label}
        </span>
        <div className="flex items-baseline space-x-1">
          <span className="text-6xl font-bold font-numeric tracking-tight text-white drop-shadow-md">
            {value > 0 ? value.toFixed(value >= 100 ? 1 : 2) : "--"}
          </span>
          <span className="text-sm font-medium text-zinc-400">Mbps</span>
        </div>
        
        {/* Subtle breathing dot during active test */}
        <div className="mt-3 flex items-center space-x-2">
          {isTesting && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          )}
          <span className="text-xs text-zinc-500 font-medium">
            {stage === "idle" && "点击下方按钮启动"}
            {stage === "ping" && "正在测试延迟..."}
            {stage === "download" && "正在下行拉流..."}
            {stage === "upload" && "正在上行推流..."}
            {stage === "finished" && "测试结束"}
          </span>
        </div>
      </div>
    </div>
  );
};
