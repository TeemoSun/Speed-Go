import { useState, useEffect } from "react";
import { 
  Zap, 
  ArrowDown, 
  ArrowUp, 
  Clock, 
  History, 
  Copy, 
  Check, 
  Square, 
  Terminal,
  MapPin
} from "lucide-react";
import { Gauge } from "./components/Gauge";
import { PingChart } from "./components/PingChart";
import { HistoryModal } from "./components/HistoryModal";
import { useSpeedtest } from "./hooks/useSpeedtest";
import { detectLanguage, setCookie, translations } from "./locales";
import type { LangCode } from "./locales";

export function App() {
  const [lang, setLang] = useState<LangCode>("zh-CN");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const t = translations[lang];
  const {
    stage,
    isTesting,
    currentSpeed,
    downloadSpeed,
    uploadSpeed,
    ping,
    jitter,
    ipInfo,
    fetchIP,
    startTest,
    abortTest,
  } = useSpeedtest();

  // Initialize IP and language
  useEffect(() => {
    fetchIP().then((info) => {
      const initialLang = detectLanguage(info?.suggested_lang);
      setLang(initialLang);
    });
  }, [fetchIP]);

  // Language switch handler
  const handleLangChange = (newLang: LangCode) => {
    setLang(newLang);
    setCookie("speed_lang", newLang);
  };

  // Copy CLI command
  const cliCommand = `curl -sL ${window.location.origin}/cli | bash`;
  const handleCopyCLI = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-between p-4 md:p-8 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[140px]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center space-y-8">
        {/* Navigation Bar */}
        <header className="w-full flex items-center justify-between glass-panel rounded-2xl px-5 py-3 shadow-md">
          {/* Brand Logo */}
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-zinc-950 font-bold shadow-lg shadow-cyan-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight text-white m-0 leading-none">
                Speed<span className="text-cyan-400">Go</span>
              </h1>
              <span className="text-[10px] text-zinc-400 font-medium tracking-wide">
                v1.0.0
              </span>
            </div>
          </div>

          {/* Network Location Pill (Middle) */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-zinc-300">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-numeric font-medium text-zinc-200">
              {ipInfo?.masked_ip || "正在解析网络..."}
            </span>
            {ipInfo && (
              <span className="text-zinc-500 text-[11px]">
                ({[ipInfo.country_name, ipInfo.city_name].filter(Boolean).join(" · ") || (ipInfo.is_lan ? "局域网" : "公网")})
              </span>
            )}
          </div>

          {/* Actions (Right) */}
          <div className="flex items-center space-x-2">
            {/* History Button */}
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition cursor-pointer"
            >
              <History className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">{t.history}</span>
            </button>

            {/* Language Switcher */}
            <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/5 p-1 text-xs">
              <button
                onClick={() => handleLangChange("zh-CN")}
                className={`px-2 py-1 rounded-lg font-medium transition cursor-pointer ${
                  lang === "zh-CN"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                中文
              </button>
              <button
                onClick={() => handleLangChange("en-US")}
                className={`px-2 py-1 rounded-lg font-medium transition cursor-pointer ${
                  lang === "en-US"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </header>

        {/* Hero Speedtest Card */}
        <div className="w-full glass-panel rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center relative overflow-hidden border border-white/10">
          {/* Stage Prompt Banner */}
          <div className="text-center mb-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-1">
              {stage === "idle" && t.phaseReady}
              {stage === "ping" && t.phasePing}
              {stage === "download" && t.phaseDownload}
              {stage === "upload" && t.phaseUpload}
              {stage === "finished" && t.phaseFinished}
            </h2>
            <p className="text-xs md:text-sm text-zinc-400">
              {t.tagline}
            </p>
          </div>

          {/* Central Gauge */}
          <Gauge
            value={stage === "download" || stage === "upload" ? currentSpeed : stage === "finished" ? downloadSpeed : 0}
            maxValue={1000}
            label={stage === "upload" ? t.upload : t.download}
            stage={stage}
            isTesting={isTesting}
          />

          {/* Start / Abort Controls */}
          <div className="mt-2 mb-6">
            {!isTesting ? (
              <button
                onClick={startTest}
                className="group relative inline-flex items-center justify-center px-8 py-3.5 rounded-2xl font-bold text-sm md:text-base text-zinc-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-xl shadow-cyan-500/25 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Zap className="w-5 h-5 mr-2 fill-current" />
                <span>{stage === "finished" ? t.restartTest : t.startTest}</span>
              </button>
            ) : (
              <button
                onClick={abortTest}
                className="inline-flex items-center justify-center px-7 py-3 rounded-2xl font-semibold text-sm text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 mr-2 fill-current" />
                <span>{t.abortTest}</span>
              </button>
            )}
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {/* Download Card */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center space-x-3.5">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 shrink-0">
                <ArrowDown className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-0.5">
                  {t.download}
                </span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl md:text-3xl font-bold font-numeric text-white">
                    {downloadSpeed > 0 ? downloadSpeed.toFixed(downloadSpeed >= 100 ? 1 : 2) : "--"}
                  </span>
                  <span className="text-xs font-medium text-zinc-500">Mbps</span>
                </div>
              </div>
            </div>

            {/* Upload Card */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center space-x-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 shrink-0">
                <ArrowUp className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-0.5">
                  {t.upload}
                </span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl md:text-3xl font-bold font-numeric text-white">
                    {uploadSpeed > 0 ? uploadSpeed.toFixed(uploadSpeed >= 100 ? 1 : 2) : "--"}
                  </span>
                  <span className="text-xs font-medium text-zinc-500">Mbps</span>
                </div>
              </div>
            </div>

            {/* Ping & Jitter Card */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center space-x-3.5">
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-0.5">
                  {t.ping} / {t.jitter}
                </span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl md:text-3xl font-bold font-numeric text-white">
                    {ping > 0 ? ping : "--"}
                  </span>
                  <span className="text-xs font-medium text-zinc-500">ms</span>
                  {jitter > 0 && (
                    <span className="text-xs text-purple-400 font-numeric font-medium">
                      (±{jitter}ms)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Continuous Ping Monitoring Section */}
        <div className="w-full">
          <PingChart t={t} />
        </div>

        {/* CLI Quick Terminal Capsule */}
        <div className="w-full glass-panel rounded-2xl p-5 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{t.cliTitle}</h3>
              <p className="text-xs text-zinc-400">{t.cliDesc}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto bg-black/40 px-3 py-2 rounded-xl border border-white/5">
            <code className="text-xs font-mono text-cyan-300 select-all overflow-x-auto whitespace-nowrap">
              {cliCommand}
            </code>
            <button
              onClick={handleCopyCLI}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
              title={t.copyCmd}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl py-6 mt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-2">
        <div>
          SpeedGo · 现代化高吞吐轻量网络测速系统
        </div>
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/TeemoSun/Speed-Go"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-300 transition"
          >
            GitHub 源码
          </a>
        </div>
      </footer>

      {/* History Modal Dialog */}
      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        t={t}
      />
    </div>
  );
}

export default App;
