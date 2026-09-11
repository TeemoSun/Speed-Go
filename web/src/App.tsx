import { useState, useEffect, useRef } from "react";
import { 
  Zap, 
  ArrowDown, 
  ArrowUp, 
  History, 
  Copy, 
  Check, 
  Square, 
  Terminal,
  Globe,
  Sun,
  Moon,
  CheckCircle2,
  Settings,
  User,
  ChevronDown,
  RotateCcw
} from "lucide-react";
import { Gauge } from "./components/Gauge";
import { PingChart } from "./components/PingChart";
import { HistoryModal } from "./components/HistoryModal";
import { useSpeedtest } from "./hooks/useSpeedtest";
import { useTheme } from "./hooks/useTheme";
import { 
  detectLanguage, 
  setCookie, 
  translations, 
  supportedLanguages 
} from "./locales";
import type { LangCode } from "./locales";

export function App() {
  const [lang, setLang] = useState<LangCode>("zh-CN");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const langDropdownRef = useRef<HTMLDivElement | null>(null);

  const { isDark, toggleTheme } = useTheme();
  const t = translations[lang] || translations["zh-CN"];

  const {
    stage,
    isTesting,
    currentSpeed,
    downloadSpeed,
    uploadSpeed,
    ping,
    jitter,
    avgPing,
    ipInfo,
    fetchIP,
    startTest,
    abortTest,
  } = useSpeedtest();

  // Initialize IP and detect initial language
  useEffect(() => {
    fetchIP().then((info) => {
      const initialLang = detectLanguage(info?.suggested_lang);
      setLang(initialLang);
    });
  }, [fetchIP]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Language switch handler
  const handleLangChange = (newLang: LangCode) => {
    setLang(newLang);
    setCookie("speed_lang", newLang);
    setLangDropdownOpen(false);
  };

  // Copy CLI command
  const cliCommand = `curl -sL ${window.location.origin}/cli | bash`;
  const handleCopyCLI = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentLangItem = supportedLanguages.find((l) => l.code === lang) || supportedLanguages[0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-3 sm:p-6 md:p-8 selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-300">
      {/* Background ambient lighting effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-cyan-500/10 dark:bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-500/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/10 rounded-full blur-[140px]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center space-y-4 sm:space-y-6">
        {/* Navigation Bar */}
        <header className="w-full flex items-center justify-between glass-panel rounded-2xl px-3.5 sm:px-5 py-2.5 sm:py-3 shadow-md border border-zinc-200/80 dark:border-white/10">
          {/* Brand Logo */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
            <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-zinc-950 font-bold shadow-lg shadow-cyan-500/20">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </div>
            <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-white m-0">
              Speed<span className="text-cyan-500 dark:text-cyan-400">Go</span>
            </h1>
          </div>

          {/* Actions: Theme Toggle + Language Dropdown + History */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5">
            {/* Theme Switch Capsule (Sun / Moon) */}
            <div
              onClick={toggleTheme}
              className="relative flex items-center p-0.5 sm:p-1 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 border border-zinc-300 dark:border-white/10 cursor-pointer select-none transition-colors"
              title={isDark ? t.themeLight : t.themeDark}
            >
              <div
                className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all ${
                  !isDark ? "bg-white text-amber-500 shadow-sm" : "text-zinc-400"
                }`}
              >
                <Sun className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              </div>
              <div
                className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all ${
                  isDark ? "bg-zinc-700 text-cyan-400 shadow-sm" : "text-zinc-400"
                }`}
              >
                <Moon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              </div>
            </div>

            {/* Language Selector Dropdown */}
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.05] hover:bg-zinc-200/80 dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0" />
                <span className="max-w-[58px] sm:max-w-none truncate">{currentLangItem.nativeName}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform shrink-0 ${langDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl glass-panel p-1.5 shadow-2xl border border-zinc-200 dark:border-white/10 z-50 animate-in fade-in zoom-in-95 duration-150 grid grid-cols-1 max-h-80 overflow-y-auto">
                  {supportedLanguages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => handleLangChange(l.code)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                        lang === l.code
                          ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-semibold"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{l.nativeName}</span>
                      {lang === l.code && <Check className="w-3.5 h-3.5 text-cyan-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* History Button */}
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/[0.05] hover:bg-zinc-200/80 dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/10 transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
              <span className="hidden sm:inline">{t.history}</span>
            </button>
          </div>
        </header>

        {/* Sub-navigation (RESULTS & SETTINGS) */}
        <div className="flex items-center justify-center space-x-6 sm:space-x-8 text-xs uppercase font-bold tracking-wider sm:tracking-widest text-zinc-500 dark:text-zinc-400">
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center space-x-1.5 sm:space-x-2 hover:text-cyan-500 dark:hover:text-cyan-400 transition cursor-pointer group"
          >
            <CheckCircle2 className="w-4 h-4 text-cyan-500 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>{t.results}</span>
          </button>
          <button
            onClick={() => {
              document.getElementById("ping-section")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center space-x-1.5 sm:space-x-2 hover:text-cyan-500 dark:hover:text-cyan-400 transition cursor-pointer group"
          >
            <Settings className="w-4 h-4 text-zinc-400 dark:text-zinc-400 group-hover:rotate-45 transition-transform" />
            <span>{t.settings}</span>
          </button>
        </div>

        {/* Main Speedtest Card */}
        <div className="w-full glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-2xl flex flex-col items-center relative overflow-hidden border border-zinc-200/80 dark:border-white/10">
          {/* Top Metrics Row (Active / Finished State) */}
          {stage !== "idle" && (
            <div className="w-full max-w-xl flex flex-col items-center space-y-2 mb-4 animate-in fade-in duration-200">
              {/* Row 1: Download & Upload side-by-side */}
              <div className="w-full flex items-center justify-around sm:justify-center sm:space-x-16 border-b border-zinc-200/60 dark:border-white/5 pb-3">
                {/* Download Metric */}
                <div className="flex items-center space-x-2 sm:space-x-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                    stage === "download" ? "bg-cyan-500 text-zinc-950 font-bold" : "bg-cyan-500/15 text-cyan-500 dark:text-cyan-400"
                  }`}>
                    <ArrowDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400 block leading-tight">
                      {t.download}
                    </span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-xl sm:text-2xl font-black font-numeric text-zinc-900 dark:text-white">
                        {stage === "download"
                          ? currentSpeed > 0
                            ? currentSpeed.toFixed(currentSpeed >= 100 ? 1 : 2)
                            : "--"
                          : downloadSpeed > 0
                          ? downloadSpeed.toFixed(downloadSpeed >= 100 ? 1 : 2)
                          : "--"}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-500">Mbps</span>
                    </div>
                  </div>
                </div>

                {/* Upload Metric */}
                <div className="flex items-center space-x-2 sm:space-x-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                    stage === "upload" ? "bg-amber-500 text-zinc-950 font-bold" : "bg-amber-500/15 text-amber-500"
                  }`}>
                    <ArrowUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400 block leading-tight">
                      {t.upload}
                    </span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-xl sm:text-2xl font-black font-numeric text-zinc-900 dark:text-white">
                        {stage === "upload"
                          ? currentSpeed > 0
                            ? currentSpeed.toFixed(currentSpeed >= 100 ? 1 : 2)
                            : "--"
                          : uploadSpeed > 0
                          ? uploadSpeed.toFixed(uploadSpeed >= 100 ? 1 : 2)
                          : "--"}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-500">Mbps</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Ping & Jitter indicators */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:space-x-6 text-xs text-zinc-500 dark:text-zinc-400 font-medium pt-1">
                <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                  {t.ping} ms
                </span>
                <div className="flex items-center space-x-1.5 font-numeric" title={t.minPing}>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {ping > 0 ? ping : "--"}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 font-numeric" title={t.jitter}>
                  <ArrowDown className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {jitter > 0 ? jitter : "--"}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 font-numeric" title={t.avgPing}>
                  <ArrowUp className="w-3.5 h-3.5 text-purple-500" />
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {avgPing > 0 ? avgPing : "--"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Central Area: Big GO Button (Idle) or Gauge (Testing/Finished) */}
          {stage === "idle" ? (
            <div className="my-6 sm:my-10 relative flex items-center justify-center">
              {/* Outer pulsing ripple effects */}
              <div className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-cyan-400/25 animate-ping pointer-events-none" />
              <div className="absolute w-60 h-60 sm:w-72 sm:h-72 rounded-full border border-cyan-400/10 pointer-events-none" />

              {/* Big Circular GO Button */}
              <button
                onClick={startTest}
                className="group relative w-44 h-44 sm:w-56 sm:h-56 rounded-full border-4 border-cyan-400 bg-white dark:bg-black/80 hover:bg-cyan-500/5 dark:hover:bg-zinc-950 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:shadow-[0_0_60px_rgba(6,182,212,0.6)] transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer select-none"
              >
                {/* Perfectly centered GO text */}
                <span className="text-4xl sm:text-5xl font-black tracking-wider text-zinc-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors leading-none pl-[0.05em]">
                  {t.go}
                </span>
                {/* Secondary label positioned absolutely to not disrupt centering */}
                <span className="absolute bottom-6 sm:bottom-8 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  {t.startTest}
                </span>
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center my-2">
              <Gauge
                value={
                  stage === "download" || stage === "upload"
                    ? currentSpeed
                    : stage === "finished"
                    ? downloadSpeed
                    : 0
                }
                label={
                  stage === "upload"
                    ? t.upload
                    : stage === "download"
                    ? t.download
                    : stage === "ping"
                    ? t.phasePing
                    : t.phaseFinished
                }
                stage={stage}
                isTesting={isTesting}
              />

              {/* Controls: Abort or Test Again */}
              <div className="mt-4">
                {isTesting ? (
                  <button
                    onClick={abortTest}
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-2xl font-semibold text-xs text-rose-600 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 mr-2 fill-current" />
                    <span>{t.abortTest}</span>
                  </button>
                ) : stage === "finished" ? (
                  <button
                    onClick={startTest}
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-2xl font-bold text-xs text-zinc-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-2" />
                    <span>{t.restartTest}</span>
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* Client Network & IP Info (User, ISP, IP, Location) */}
          <div className="w-full max-w-xl flex items-center justify-between pt-5 sm:pt-6 border-t border-zinc-200/70 dark:border-white/5 my-2">
            {/* Left: User Avatar on the far left + ISP & IP */}
            <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 pr-2">
                <div className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {ipInfo?.isp || (ipInfo?.is_lan ? t.client : "未知运营商")}
                </div>
                <div className="text-[11px] sm:text-xs font-numeric text-zinc-500 dark:text-zinc-400 truncate">
                  {ipInfo?.masked_ip || ipInfo?.ip || "正在解析..."}
                </div>
              </div>
            </div>

            {/* Right: Location / Address */}
            <div className="text-right shrink-0 max-w-[45%] sm:max-w-none">
              <div className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {[ipInfo?.city_name, ipInfo?.country_name].filter(Boolean).join(", ") || (ipInfo?.is_lan ? (lang === "zh-CN" || lang === "zh-TW" ? "本地局域网" : "Local LAN") : t.client)}
              </div>
              <div className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {ipInfo?.region_name || (ipInfo?.is_lan ? "Localhost / LAN" : t.location)}
              </div>
            </div>
          </div>

          {/* Bottom Accent / Progress Line */}
          <div className="w-48 sm:w-96 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mt-4 sm:mt-6 rounded-full opacity-60" />
        </div>

        {/* Continuous Ping Monitoring Section */}
        <div id="ping-section" className="w-full">
          <PingChart t={t} />
        </div>

        {/* CLI Quick Terminal Capsule */}
        <div id="cli-section" className="w-full glass-panel rounded-2xl p-4 sm:p-5 border border-zinc-200/80 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">{t.cliTitle}</h3>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">{t.cliDesc}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto bg-zinc-100 dark:bg-black/40 px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/5 min-w-0">
            <code className="text-xs font-mono text-cyan-600 dark:text-cyan-300 select-all overflow-x-auto whitespace-nowrap min-w-0 flex-1">
              {cliCommand}
            </code>
            <button
              onClick={handleCopyCLI}
              className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
              title={t.copyCmd}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl py-4 sm:py-6 mt-6 sm:mt-8 border-t border-zinc-200/70 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 gap-2 text-center sm:text-left">
        <div>
          SpeedGo · 现代化高吞吐轻量网络测速系统
        </div>
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/TeemoSun/Speed-Go"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-700 dark:hover:text-zinc-200 transition"
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
