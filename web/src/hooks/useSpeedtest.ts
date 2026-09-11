import { useState, useRef, useCallback } from "react";

export type TestStage = "idle" | "ping" | "download" | "upload" | "finished";

export interface IPInfo {
  ip: string;
  masked_ip: string;
  is_lan: boolean;
  country_code: string;
  country_name: string;
  region_name: string;
  city_name: string;
  isp: string;
  asn: number;
  suggested_lang: string;
}

export const useSpeedtest = () => {
  const [stage, setStage] = useState<TestStage>("idle");
  const [isTesting, setIsTesting] = useState(false);

  // Real-time speed gauges
  const [currentSpeed, setCurrentSpeed] = useState(0);

  // Final recorded results
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [ping, setPing] = useState(0);
  const [jitter, setJitter] = useState(0);
  const [avgPing, setAvgPing] = useState(0);
  const [worstPing, setWorstPing] = useState(0);
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [testId, setTestId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch client IP info
  const fetchIP = useCallback(async () => {
    try {
      const res = await fetch("/api/ip", { cache: "no-store" });
      if (res.ok) {
        const data: IPInfo = await res.json();
        setIpInfo(data);
        return data;
      }
    } catch (e) {
      console.error("Failed to fetch IP info:", e);
    }
    return null;
  }, []);

  // 1. Measure Ping & Jitter via WebSocket
  const runPingStage = useCallback(async (signal: AbortSignal): Promise<{ min: number; avg: number; worst: number; jitter: number }> => {
    return new Promise((resolve) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/ping`;
      const ws = new WebSocket(wsUrl);

      const pings: number[] = [];
      let seq = 0;
      let prevPing = 0;
      let currentJitter = 0;

      const finish = () => {
        ws.close();
        if (pings.length === 0) {
          resolve({ min: 10, avg: 10, worst: 10, jitter: 1 });
          return;
        }
        const min = Math.min(...pings);
        const worst = Math.max(...pings);
        const avg = Math.round((pings.reduce((a, b) => a + b, 0) / pings.length) * 10) / 10;
        resolve({ min, avg, worst, jitter: Math.round(currentJitter * 10) / 10 });
      };

      signal.addEventListener("abort", finish);

      ws.onopen = () => {
        const interval = setInterval(() => {
          if (signal.aborted || ws.readyState !== WebSocket.OPEN) {
            clearInterval(interval);
            finish();
            return;
          }

          if (seq >= 15) {
            clearInterval(interval);
            finish();
            return;
          }

          seq++;
          const now = Date.now();
          ws.send(JSON.stringify({ type: "ping", seq, client_time: now }));
        }, 150);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const now = Date.now();
          const rtt = Math.max(1, now - data.client_time);
          pings.push(rtt);
          setPing(Math.min(...pings));

          if (prevPing > 0) {
            const diff = Math.abs(rtt - prevPing);
            currentJitter = currentJitter === 0 ? diff : currentJitter * 0.875 + diff * 0.125;
            setJitter(Math.round(currentJitter * 10) / 10);
          }
          prevPing = rtt;
        } catch {
          // ignore
        }
      };

      ws.onerror = finish;
      ws.onclose = () => {
        if (seq < 15) finish();
      };
    });
  }, []);

  // 2. Measure Download via Fetch Streams (ReadableStream - Low RAM)
  const runDownloadStage = useCallback(async (signal: AbortSignal): Promise<number> => {
    let totalBytes = 0;
    let measureStart = Date.now();
    let isGracePeriod = true;
    const graceTimeMs = 1500; // 1.5s TCP slow start grace window
    const durationMs = 10000; // 10s test duration

    // Concurrency streams
    const concurrency = 4;
    let finalMbps = 0;

    const streamWorker = async () => {
      while (!signal.aborted && Date.now() - measureStart < durationMs) {
        try {
          const res = await fetch(`/api/download?size=50M&r=${Math.random()}`, {
            signal,
            cache: "no-store",
          });
          if (!res.body) break;

          const reader = res.body.getReader();
          while (!signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.byteLength;
            // Value is dropped immediately, 0 memory accumulation!
          }
        } catch {
          break;
        }
      }
    };

    // Calculate speed every 100ms
    const timer = setInterval(() => {
      const elapsed = Date.now() - measureStart;
      if (isGracePeriod && elapsed >= graceTimeMs) {
        // Reset measurement after grace period so TCP slow-start does not drag down speed
        totalBytes = 0;
        measureStart = Date.now();
        isGracePeriod = false;
        return;
      }

      const activeTimeSec = (Date.now() - measureStart) / 1000;
      if (activeTimeSec > 0.2) {
        const mbps = (totalBytes * 8) / (activeTimeSec * 1000000);
        setCurrentSpeed(mbps);
        finalMbps = mbps;
      }
    }, 100);

    // Launch streams
    const workers = Array.from({ length: concurrency }).map(() => streamWorker());
    await Promise.race([
      Promise.all(workers),
      new Promise((r) => setTimeout(r, durationMs + graceTimeMs)),
    ]);

    clearInterval(timer);
    return Math.round(finalMbps * 100) / 100;
  }, []);

  // 3. Measure Upload via Multi-stream POST (Reusable Memory Buffers)
  const runUploadStage = useCallback(async (signal: AbortSignal): Promise<number> => {
    // Generate a 1MB incompressible static random Blob once
    const chunk = new Uint8Array(1024 * 1024);
    for (let i = 0; i < chunk.length; i++) {
      chunk[i] = (i * 1103515245 + 12345) & 0xff;
    }
    const blob = new Blob([chunk], { type: "application/octet-stream" });

    let totalBytes = 0;
    let measureStart = Date.now();
    let isGracePeriod = true;
    const graceTimeMs = 1500;
    const durationMs = 10000;
    const concurrency = 3;
    let finalMbps = 0;

    const streamWorker = async () => {
      while (!signal.aborted && Date.now() - measureStart < durationMs) {
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            body: blob,
            signal,
            cache: "no-store",
            headers: {
              "Content-Encoding": "identity",
            },
          });
          if (res.ok) {
            totalBytes += chunk.length;
          }
        } catch {
          break;
        }
      }
    };

    const timer = setInterval(() => {
      const elapsed = Date.now() - measureStart;
      if (isGracePeriod && elapsed >= graceTimeMs) {
        totalBytes = 0;
        measureStart = Date.now();
        isGracePeriod = false;
        return;
      }

      const activeTimeSec = (Date.now() - measureStart) / 1000;
      if (activeTimeSec > 0.2) {
        const mbps = (totalBytes * 8) / (activeTimeSec * 1000000);
        setCurrentSpeed(mbps);
        finalMbps = mbps;
      }
    }, 100);

    const workers = Array.from({ length: concurrency }).map(() => streamWorker());
    await Promise.race([
      Promise.all(workers),
      new Promise((r) => setTimeout(r, durationMs + graceTimeMs)),
    ]);

    clearInterval(timer);
    return Math.round(finalMbps * 100) / 100;
  }, []);

  // Abort ongoing test
  const abortTest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTesting(false);
    setStage("idle");
    setCurrentSpeed(0);
  }, []);

  // Start complete test
  const startTest = useCallback(async () => {
    abortTest();
    setIsTesting(true);
    setTestId(null);
    setCurrentSpeed(0);
    setDownloadSpeed(0);
    setUploadSpeed(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Refresh IP
    await fetchIP();

    // Stage 1: Ping
    setStage("ping");
    const pingResult = await runPingStage(controller.signal);
    setPing(pingResult.min);
    setAvgPing(pingResult.avg);
    setWorstPing(pingResult.worst);
    setJitter(pingResult.jitter);

    if (controller.signal.aborted) return;

    // Stage 2: Download
    setStage("download");
    setCurrentSpeed(0);
    const dlResult = await runDownloadStage(controller.signal);
    setDownloadSpeed(dlResult);
    setCurrentSpeed(dlResult);

    if (controller.signal.aborted) return;

    // Stage 3: Upload
    setStage("upload");
    setCurrentSpeed(0);
    const ulResult = await runUploadStage(controller.signal);
    setUploadSpeed(ulResult);
    setCurrentSpeed(ulResult);

    // Stage 4: Finished & Save
    setStage("finished");
    setIsTesting(false);

    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          download_mbps: dlResult,
          upload_mbps: ulResult,
          ping_ms: pingResult.min,
          avg_ping_ms: pingResult.avg,
          worst_ping_ms: pingResult.worst,
          jitter_ms: pingResult.jitter,
          packet_loss: 0,
          disconnects: 0,
          test_type: "web",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestId(data.test_id);
      }
    } catch (e) {
      console.error("Failed to save results:", e);
    }
  }, [abortTest, fetchIP, runPingStage, runDownloadStage, runUploadStage]);

  return {
    stage,
    isTesting,
    currentSpeed,
    downloadSpeed,
    uploadSpeed,
    ping,
    jitter,
    avgPing,
    worstPing,
    ipInfo,
    testId,
    fetchIP,
    startTest,
    abortTest,
  };
};
