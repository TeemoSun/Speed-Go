import React, { useEffect, useRef, useState, useCallback } from "react";
import { Activity, Play, Square, AlertCircle } from "lucide-react";
import type { Translations } from "../locales/zh-CN";

interface PingProbe {
  time: number; // millisecond timestamp
  rtt: number;  // ms
  lost: boolean;
}

interface PingChartProps {
  t: Translations;
  autoStart?: boolean;
}

export const PingChart: React.FC<PingChartProps> = ({ t, autoStart = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [probes, setProbes] = useState<PingProbe[]>([]);
  const [disconnects, setDisconnects] = useState(0);

  // Statistics
  const [currentPing, setCurrentPing] = useState(0);
  const [minPing, setMinPing] = useState(0);
  const [avgPing, setAvgPing] = useState(0);
  const [worstPing, setWorstPing] = useState(0);
  const [jitter, setJitter] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const seqRef = useRef(0);
  const probeTimerRef = useRef<number | null>(null);
  const pendingMapRef = useRef<Map<number, number>>(new Map());

  // WebSocket start/stop
  const stopProbe = useCallback(() => {
    setIsRunning(false);
    if (probeTimerRef.current) {
      clearInterval(probeTimerRef.current);
      probeTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const startProbe = useCallback(() => {
    stopProbe();
    setIsRunning(true);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/ping`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send ping probe every 200ms
      probeTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const now = Date.now();
          const seq = ++seqRef.current;
          pendingMapRef.current.set(seq, now);

          ws.send(JSON.stringify({ type: "ping", seq, client_time: now }));

          // Check for timeouts after 1500ms
          setTimeout(() => {
            if (pendingMapRef.current.has(seq)) {
              pendingMapRef.current.delete(seq);
              // Register dropped packet
              setProbes((prev) => [...prev.slice(-60), { time: now, rtt: 0, lost: true }]);
            }
          }, 1500);
        }
      }, 200);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const now = Date.now();
        const sendTime = pendingMapRef.current.get(data.seq);
        if (sendTime) {
          pendingMapRef.current.delete(data.seq);
          const rtt = Math.max(1, now - sendTime);

          setProbes((prev) => {
            const next = [...prev.slice(-60), { time: now, rtt, lost: false }];
            return next;
          });
        }
      } catch (e) {
        console.error("Failed to parse WS pong:", e);
      }
    };

    ws.onclose = () => {
      setDisconnects((prev) => prev + 1);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [stopProbe]);

  useEffect(() => {
    if (autoStart) {
      startProbe();
    }
    return () => {
      stopProbe();
    };
  }, [autoStart, startProbe, stopProbe]);

  // Recalculate statistics whenever probes change
  useEffect(() => {
    if (probes.length === 0) return;

    let validCount = 0;
    let lostCount = 0;
    let totalRtt = 0;
    let min = 999999;
    let max = 0;
    let prevRtt = 0;
    let j = 0;

    probes.forEach((p) => {
      if (p.lost) {
        lostCount++;
      } else {
        validCount++;
        totalRtt += p.rtt;
        if (p.rtt < min) min = p.rtt;
        if (p.rtt > max) max = p.rtt;

        if (prevRtt > 0) {
          const diff = Math.abs(p.rtt - prevRtt);
          j = j === 0 ? diff : j * 0.875 + diff * 0.125;
        }
        prevRtt = p.rtt;
      }
    });

    const last = probes[probes.length - 1];
    if (!last.lost) {
      setCurrentPing(last.rtt);
    }

    if (validCount > 0) {
      setMinPing(min);
      setWorstPing(max);
      setAvgPing(Math.round((totalRtt / validCount) * 10) / 10);
      setJitter(Math.round(j * 10) / 10);
    }
    setPacketLoss(Math.round((lostCount / probes.length) * 1000) / 10);
  }, [probes]);

  // Draw smooth Canvas chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 600;
    const height = 160;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Determine max Y scale (minimum 50ms)
    let maxY = 50;
    probes.forEach((p) => {
      if (!p.lost && p.rtt > maxY) maxY = p.rtt * 1.25;
    });

    // Draw horizontal grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "10px monospace";

    const gridSteps = [0.25, 0.5, 0.75];
    gridSteps.forEach((step) => {
      const y = height - height * step;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(`${Math.round(maxY * step)}ms`, 10, y - 4);
    });

    if (probes.length < 2) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(isRunning ? "正在持续探测链路..." : "点击右上角启动连续探测", width / 2, height / 2);
      return;
    }

    const stepX = width / Math.max(probes.length - 1, 1);

    // Draw area gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(6, 182, 212, 0.25)");
    gradient.addColorStop(1, "rgba(6, 182, 212, 0.0)");

    ctx.beginPath();
    ctx.moveTo(0, height);

    probes.forEach((p, idx) => {
      const x = idx * stepX;
      const y = p.lost ? height : height - (p.rtt / maxY) * height;
      if (idx === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw main RTT line
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#06b6d4"; // cyan
    ctx.lineJoin = "round";

    let segmentActive = false;
    probes.forEach((p, idx) => {
      const x = idx * stepX;
      if (p.lost) {
        segmentActive = false;
      } else {
        const y = height - (p.rtt / maxY) * height;
        if (!segmentActive) {
          ctx.moveTo(x, y);
          segmentActive = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();

    // Draw lost packet red markers
    probes.forEach((p, idx) => {
      if (p.lost) {
        const x = idx * stepX;
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(x, height - 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [probes, isRunning]);

  return (
    <div className="glass-panel rounded-2xl p-5 w-full shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm md:text-base">
              {t.continuousPingTitle}
            </h3>
            <p className="text-xs text-zinc-400 hidden sm:block">
              {t.continuousPingDesc}
            </p>
          </div>
        </div>

        <button
          onClick={isRunning ? stopProbe : startProbe}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isRunning
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30"
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{t.stopContinuousPing}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.startContinuousPing}</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-0.5">
            {t.ping}
          </span>
          <span className="text-base font-bold font-numeric text-cyan-300">
            {currentPing > 0 ? `${currentPing}ms` : "--"}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-0.5">
            {t.minPing}
          </span>
          <span className="text-base font-bold font-numeric text-emerald-400">
            {minPing > 0 ? `${minPing}ms` : "--"}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-0.5">
            {t.avgPing}
          </span>
          <span className="text-base font-bold font-numeric text-white">
            {avgPing > 0 ? `${avgPing}ms` : "--"}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-0.5">
            {t.worstPing}
          </span>
          <span className="text-base font-bold font-numeric text-amber-400">
            {worstPing > 0 ? `${worstPing}ms` : "--"}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-0.5">
            {t.jitter}
          </span>
          <span className="text-base font-bold font-numeric text-purple-400">
            {jitter > 0 ? `${jitter}ms` : "--"}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-0.5">
            {t.packetLoss}
          </span>
          <span className={`text-base font-bold font-numeric ${packetLoss > 0 ? "text-rose-400" : "text-zinc-300"}`}>
            {packetLoss}%
          </span>
        </div>
      </div>

      {/* Dynamic Canvas */}
      <div className="relative w-full h-[160px] rounded-xl overflow-hidden bg-black/30 border border-white/5">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Disconnect indicator */}
      {disconnects > 0 && (
        <div className="mt-3 flex items-center space-x-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>探测期间检测到网络异常断开 {disconnects} 次</span>
        </div>
      )}
    </div>
  );
};
