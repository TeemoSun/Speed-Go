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
  User, 
  ChevronDown, 
  RotateCcw,
  Share2
} from "lucide-react";
import { PingChart } from "./components/PingChart";
import { HistoryModal } from "./components/HistoryModal";
import { ResultModal } from "./components/ResultModal";
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
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [sharedResultId, setSharedResultId] = useState<string | null>(null);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const langDropdownRef = useRef<HTMLDivElement | null>(null);

  const { isDark, toggleTheme } = useTheme();
  const t = translations[lang] || translations["zh-CN"];

  const {
    stage,
    isTesting,
    stageProgress,
    currentSpeed,
    downloadSpeed,
    uploadSpeed,
    ping,
    jitter,
    avgPing,
    ipInfo,
    testId,
    fetchIP,
    startTest,
    abortTest,
  } = useSpeedtest();

  const locationText = [ipInfo?.city_name, ipInfo?.country_name].filter(Boolean).join(", ");

  // Helper to extract result ID from hash (#result=rec_... or #rec_...) or search query (?result=rec_...)
  const extractResultId = () => {
    const hash = window.location.hash;
    if (hash) {
      const match = hash.match(/result=([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
      const directMatch = hash.match(/^#(rec_[a-zA-Z0-9]+)$/);
      if (directMatch) return directMatch[1];
    }
    const params = new URLSearchParams(window.location.search);
    const resultParam = params.get("result");
    if (resultParam) return resultParam;
    return null;
  };

  // Check URL on initial load and listen for hash/history changes
  useEffect(() => {
    const checkUrl = () => {
      const rid = extractResultId();
      if (rid) {
        setSharedResultId(rid);
        setResultModalOpen(true);
      }
    };

    checkUrl();

    window.addEventListener("hashchange", checkUrl);
    window.addEventListener("popstate", checkUrl);
    return () => {
      window.removeEventListener("hashchange", checkUrl);
      window.removeEventListener("popstate", checkUrl);
    };
  }, []);

  const handleCloseResultModal = () => {
    setResultModalOpen(false);
    setSharedResultId(null);
    if (window.location.hash.includes("result=") || window.location.hash.startsWith("#rec_")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  const handleOpenResult = (id: string) => {
    setSharedResultId(id);
    setResultModalOpen(true);
    window.history.replaceState(null, "", `${window.location.pathname}#result=${id}`);
  };

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

        {/* Main Speedtest Card - Scheme 3 Clean Aurora */}
        <div className="w-full glass-panel rounded-3xl p-6 sm:p-10 md:p-12 shadow-2xl flex flex-col items-center relative overflow-hidden border border-zinc-200/80 dark:border-white/10">
          {/* Subtle Aurora Ambient Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.1)_0,transparent_65%)] pointer-events-none" />

          {/* Dual Big Numbers (Download & Upload) */}
          <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 my-2 text-center z-10">
            {/* Download Hero Column */}
            <div className={`flex flex-col items-center relative p-3 rounded-2xl transition-all duration-300 ${
              stage === "download" ? "scale-105" : ""
            }`}>
              <div className="text-xs uppercase font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5 mb-2">
                <ArrowDown className="w-4 h-4 stroke-[2.5]" />
                <span>{t.download}</span>
              </div>

              <div className="text-6xl sm:text-7xl md:text-8xl font-black font-numeric text-zinc-900 dark:text-white tracking-tighter transition-all">
                {stage === "download"
                  ? currentSpeed > 0
                    ? currentSpeed.toFixed(currentSpeed >= 100 ? 1 : 2)
                    : "--"
                  : downloadSpeed > 0
                  ? downloadSpeed.toFixed(downloadSpeed >= 100 ? 1 : 2)
                  : "--"}
              </div>

              <span className="text-xs sm:text-sm font-bold text-zinc-500 dark:text-zinc-400 mt-1">Mbps</span>

              {/* Active Glow Underline */}
              <div className={`h-1.5 rounded-full mt-3 transition-all duration-300 ${
                stage === "download"
                  ? "w-28 sm:w-36 bg-emerald-400 shadow-[0_0_16px_#34d399]"
                  : downloadSpeed > 0
                  ? "w-20 sm:w-24 bg-emerald-500/30"
                  : "w-12 bg-transparent"
              }`} />
            </div>

            {/* Upload Hero Column */}
            <div className={`flex flex-col items-center relative p-3 rounded-2xl transition-all duration-300 ${
              stage === "upload" ? "scale-105" : ""
            }`}>
              <div className="text-xs uppercase font-extrabold tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center space-x-1.5 mb-2">
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                <span>{t.upload}</span>
              </div>

              <div className="text-6xl sm:text-7xl md:text-8xl font-black font-numeric text-zinc-900 dark:text-white tracking-tighter transition-all">
                {stage === "upload"
                  ? currentSpeed > 0
                    ? currentSpeed.toFixed(currentSpeed >= 100 ? 1 : 2)
                    : "--"
                  : uploadSpeed > 0
                  ? uploadSpeed.toFixed(uploadSpeed >= 100 ? 1 : 2)
                  : "--"}
              </div>

              <span className="text-xs sm:text-sm font-bold text-zinc-500 dark:text-zinc-400 mt-1">Mbps</span>

              {/* Active Glow Underline */}
              <div className={`h-1.5 rounded-full mt-3 transition-all duration-300 ${
                stage === "upload"
                  ? "w-28 sm:w-36 bg-cyan-400 shadow-[0_0_16px_#22d3ee]"
                  : uploadSpeed > 0
                  ? "w-20 sm:w-24 bg-cyan-500/30"
                  : "w-12 bg-transparent"
              }`} />
            </div>
          </div>

          {/* Segmented 3-Stage Progress Bar System (Ping 18% / Download 47% / Upload 35%) */}
          <div className="w-full max-w-xl my-6 flex flex-col space-y-2.5 px-2 z-10">
            {/* Status line & Percentage */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  stage === "idle"
                    ? "bg-zinc-400 dark:bg-zinc-600"
                    : stage === "ping"
                    ? "bg-amber-400 animate-pulse"
                    : stage === "download"
                    ? "bg-emerald-400 animate-pulse"
                    : stage === "upload"
                    ? "bg-cyan-400 animate-pulse"
                    : "bg-emerald-500"
                }`} />
                <span className="text-zinc-700 dark:text-zinc-300 font-semibold">
                  {stage === "idle"
                    ? t.phaseReady
                    : stage === "ping"
                    ? t.phasePing
                    : stage === "download"
                    ? t.phaseDownload
                    : stage === "upload"
                    ? t.phaseUpload
                    : t.phaseFinished}
                </span>
              </div>

              <span className="text-emerald-600 dark:text-emerald-400 font-bold font-numeric text-sm">
                {stageProgress.total}%
              </span>
            </div>

            {/* 3-Segment Progress Bar Track with subtle gap */}
            <div className="w-full flex items-center gap-2 h-2.5">
              {/* Segment 1: Ping (18%) */}
              <div className="w-[18%] h-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded-full overflow-hidden p-0.5 border border-zinc-300 dark:border-white/5 relative" title={t.stagePingTooltip}>
                <div
                  className="h-full rounded-full bg-cyan-500 dark:bg-cyan-400 transition-all duration-200"
                  style={{ width: `${stageProgress.ping}%` }}
                />
              </div>

              {/* Segment 2: Download (47%) */}
              <div className="w-[47%] h-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded-full overflow-hidden p-0.5 border border-zinc-300 dark:border-white/5 relative" title={t.stageDownloadTooltip}>
                <div
                  className="h-full rounded-full bg-cyan-500 dark:bg-cyan-400 transition-all duration-200"
                  style={{ width: `${stageProgress.download}%` }}
                />
              </div>

              {/* Segment 3: Upload (35%) */}
              <div className="w-[35%] h-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded-full overflow-hidden p-0.5 border border-zinc-300 dark:border-white/5 relative" title={t.stageUploadTooltip}>
                <div
                  className="h-full rounded-full bg-cyan-500 dark:bg-cyan-400 transition-all duration-200"
                  style={{ width: `${stageProgress.upload}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Button Controls */}
          <div className="mt-2 mb-6 z-10 flex flex-wrap items-center justify-center gap-3">
            {stage === "idle" ? (
              <button
                onClick={startTest}
                className="group relative px-10 py-3.5 rounded-full font-black text-sm tracking-wider uppercase transition-all duration-300 transform hover:scale-105 active:scale-95 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-zinc-950 shadow-xl shadow-cyan-500/25 flex items-center space-x-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{t.startTest}</span>
              </button>
            ) : isTesting ? (
              <button
                onClick={abortTest}
                className="inline-flex items-center justify-center px-8 py-3 rounded-full font-bold text-xs text-rose-600 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 mr-2 fill-current" />
                <span>{t.abortTest}</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={startTest}
                  className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-bold text-xs text-zinc-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  <span>{t.restartTest}</span>
                </button>
                {testId && (
                  <button
                    onClick={() => handleOpenResult(testId)}
                    className="inline-flex items-center justify-center px-6 py-3.5 rounded-full font-semibold text-xs text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/15 border border-zinc-200 dark:border-white/10 shadow-sm transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 mr-2 text-cyan-500 dark:text-cyan-400" />
                    <span>{t.share}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Compact Network Metrics & IP Info */}
          <div className="w-full max-w-2xl pt-5 sm:pt-6 border-t border-zinc-200/70 dark:border-white/5 flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-4 text-xs z-10">
            {/* Ping & Jitter metrics (evenly spread on mobile) */}
            <div className="w-full sm:w-auto flex items-center justify-around sm:justify-start gap-6">
              <div className="flex items-center gap-1.5" title={t.minPing}>
                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">PING</span>
                <span className="font-numeric font-bold text-zinc-800 dark:text-zinc-200">
                  {ping > 0 ? `${ping} ms` : "--"}
                </span>
              </div>
              <div className="flex items-center gap-1.5" title={t.jitter}>
                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">JITTER</span>
                <span className="font-numeric font-bold text-zinc-800 dark:text-zinc-200">
                  {jitter > 0 ? `${jitter} ms` : "--"}
                </span>
              </div>
              {avgPing > 0 && (
                <div className="flex items-center gap-1.5" title={t.avgPing}>
                  <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">AVG</span>
                  <span className="font-numeric font-bold text-zinc-800 dark:text-zinc-200">
                    {avgPing} ms
                  </span>
                </div>
              )}
            </div>

            {/* ISP & IP (stacked on mobile, inline on desktop) */}
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-zinc-600 dark:text-zinc-400 min-w-0">
              <User className="hidden sm:block w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span
                className="truncate max-w-full text-center sm:text-left sm:max-w-[200px]"
                title={ipInfo?.isp || (ipInfo?.is_lan ? t.client : t.unknownIsp)}
              >
                {ipInfo?.isp || (ipInfo?.is_lan ? t.client : t.unknownIsp)}
              </span>
              <span className="hidden sm:inline text-zinc-400">·</span>
              <span className="flex items-center gap-1.5 min-w-0 max-w-full">
                <span className="font-numeric shrink-0">
                  {ipInfo?.masked_ip || ipInfo?.ip || t.resolving}
                </span>
                {locationText && (
                  <>
                    <span className="text-zinc-400 shrink-0">·</span>
                    <span className="truncate" title={locationText}>
                      {locationText}
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>
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
          SpeedGo · {t.footerSlogan}
        </div>
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/TeemoSun/Speed-Go"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-700 dark:hover:text-zinc-200 transition"
          >
            {t.githubSource}
          </a>
        </div>
      </footer>

      {/* History Modal Dialog */}
      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectRecord={(id) => {
          setHistoryOpen(false);
          handleOpenResult(id);
        }}
        t={t}
      />

      {/* Speedtest Result Report Dialog */}
      <ResultModal
        isOpen={resultModalOpen}
        resultId={sharedResultId}
        onClose={handleCloseResultModal}
        onStartTest={() => {
          handleCloseResultModal();
          startTest();
        }}
        t={t}
      />
    </div>
  );
}

export default App;
