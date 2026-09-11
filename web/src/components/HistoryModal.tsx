import React, { useState, useEffect } from "react";
import { X, History, Globe, User, RefreshCw, Terminal, Monitor, ExternalLink } from "lucide-react";
import type { Translations } from "../locales/zh-CN";

interface TestRecord {
  id: string;
  masked_ip: string;
  country_name?: string;
  city_name?: string;
  isp?: string;
  download_mbps: number;
  upload_mbps: number;
  ping_ms: number;
  jitter_ms: number;
  packet_loss: number;
  test_type: string;
  created_at: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecord?: (id: string) => void;
  t: Translations;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onSelectRecord, t }) => {
  const [tab, setTab] = useState<"me" | "public">("me");
  const [records, setRecords] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const endpoint = tab === "me" ? "/api/history/me" : "/api/history/public";
      const res = await fetch(`${endpoint}?limit=30`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (e) {
      console.error("Failed to fetch history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, tab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[85vh] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col border border-zinc-200 dark:border-white/10 overflow-hidden text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-zinc-200/60 dark:border-white/5">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 shrink-0">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-tight">{t.history}</h2>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">查看本机测试历史与全网最新公开测速成绩</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-1.5 sm:p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-500" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex space-x-2 my-3 sm:my-4 p-1 bg-zinc-100 dark:bg-white/[0.03] rounded-full border border-zinc-200 dark:border-white/5 w-full sm:w-fit">
          <button
            onClick={() => setTab("me")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              tab === "me"
                ? "bg-cyan-500 text-zinc-950 shadow-md font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{t.myHistory}</span>
          </button>
          <button
            onClick={() => setTab("public")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              tab === "public"
                ? "bg-cyan-500 text-zinc-950 shadow-md font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t.publicHistory}</span>
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto overscroll-contain pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <RefreshCw className="w-7 h-7 animate-spin mb-3 text-cyan-400" />
              <span className="text-xs">加载历史记录中...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 text-xs">
              {t.emptyHistory}
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((r) => {
                const date = new Date(r.created_at);
                const timeStr = date.toLocaleString();
                const location = [r.country_name, r.city_name].filter(Boolean).join(" · ") || "本地网络";

                return (
                  <div
                    key={r.id}
                    onClick={() => onSelectRecord?.(r.id)}
                    className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] hover:bg-zinc-100 dark:hover:bg-white/[0.05] border border-zinc-200 dark:border-white/5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                    title={t.share || "查看测速报告"}
                  >
                    {/* Left: Location & IP */}
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-zinc-200/60 dark:bg-white/[0.04] text-zinc-500 dark:text-zinc-400 shrink-0">
                        {r.test_type === "cli" ? (
                          <Terminal className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        ) : (
                          <Monitor className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                            {r.masked_ip}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-white/5 text-zinc-600 dark:text-zinc-400">
                            {location}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-0.5">
                          {r.isp || "运营商未知"} · {timeStr}
                        </div>
                      </div>
                    </div>

                    {/* Right: Metrics + View Icon */}
                    <div className="flex items-center space-x-4 shrink-0 justify-between sm:justify-end border-t sm:border-0 border-zinc-200/60 dark:border-white/5 pt-2 sm:pt-0">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block">下载</span>
                        <span className="text-sm font-bold font-numeric text-emerald-500 dark:text-emerald-400">
                          {r.download_mbps > 0 ? `${r.download_mbps.toFixed(1)}M` : "--"}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block">上传</span>
                        <span className="text-sm font-bold font-numeric text-cyan-600 dark:text-cyan-400">
                          {r.upload_mbps > 0 ? `${r.upload_mbps.toFixed(1)}M` : "--"}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block">延迟/抖动</span>
                        <span className="text-sm font-bold font-numeric text-cyan-500 dark:text-cyan-300">
                          {r.ping_ms > 0 ? `${r.ping_ms.toFixed(0)}ms` : "--"}
                        </span>
                      </div>

                      <div className="p-1 rounded-lg text-zinc-400 group-hover:text-cyan-500 group-hover:bg-cyan-500/10 transition shrink-0 hidden sm:flex items-center">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
