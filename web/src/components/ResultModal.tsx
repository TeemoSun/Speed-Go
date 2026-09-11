import React, { useState, useEffect } from "react";
import { 
  X, 
  Zap, 
  ArrowDown, 
  ArrowUp, 
  Copy, 
  Check, 
  Terminal, 
  Monitor, 
  Calendar, 
  Globe, 
  User, 
  RefreshCw,
  AlertCircle,
  Play
} from "lucide-react";
import type { Translations } from "../locales/zh-CN";

export interface TestRecord {
  id: string;
  masked_ip: string;
  country_code?: string;
  country_name?: string;
  region_name?: string;
  city_name?: string;
  isp?: string;
  download_mbps: number;
  upload_mbps: number;
  ping_ms: number;
  avg_ping_ms: number;
  worst_ping_ms: number;
  jitter_ms: number;
  packet_loss: number;
  disconnects: number;
  test_type: string;
  created_at: string;
}

interface ResultModalProps {
  isOpen: boolean;
  resultId: string | null;
  onClose: () => void;
  onStartTest?: () => void;
  t: Translations;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  resultId,
  onClose,
  onStartTest,
  t,
}) => {
  const [record, setRecord] = useState<TestRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !resultId) {
      setRecord(null);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/results/${encodeURIComponent(resultId)}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(t.recordNotFound || "未找到该测速记录，可能已被清理或 ID 输入有误");
          }
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (active) {
          setRecord(data.record);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "加载记录失败");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, resultId, t]);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/#result=${resultId || ""}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartOwnTest = () => {
    onClose();
    if (onStartTest) {
      onStartTest();
    }
  };

  const location = record 
    ? [record.country_name, record.region_name, record.city_name].filter(Boolean).join(" · ") || "未知地理位置"
    : "";

  const timeFormatted = record?.created_at
    ? new Date(record.created_at).toLocaleString()
    : "--";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[85vh] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col border border-zinc-200 dark:border-white/10 overflow-hidden text-zinc-900 dark:text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-zinc-200/60 dark:border-white/5 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-zinc-950 font-bold shadow-lg shadow-cyan-500/20 shrink-0">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                  {t.shareTitle || "测速报告"}
                </h2>
                {record && (
                  <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                    record.test_type === "cli"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                  }`}>
                    {record.test_type === "cli" ? (
                      <>
                        <Terminal className="w-3 h-3" />
                        <span>{t.cliTerminal || "CLI 终端"}</span>
                      </>
                    ) : (
                      <>
                        <Monitor className="w-3 h-3" />
                        <span>{t.webTerminal || "Web 网页端"}</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {t.shareSubtitle || "查看该次测速的详细网络指标与网络环境"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain py-4 space-y-4 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-cyan-500" />
              <span className="text-xs font-medium">正在解析测速报告...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="p-3 rounded-full bg-rose-500/10 text-rose-500 mb-3">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">{error}</p>
              <p className="text-xs text-zinc-500 max-w-sm mb-4">
                测速记录可能已被定期清理，或者链接中包含的 ID 不正确。
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-200/80 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/15 transition cursor-pointer"
              >
                {t.close}
              </button>
            </div>
          ) : record ? (
            <>
              {/* Bandwidth Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Download */}
                <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-white/[0.03] border border-emerald-500/20 dark:border-emerald-500/20 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{t.download}</span>
                    </div>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-3xl sm:text-4xl font-black font-numeric text-zinc-900 dark:text-white">
                        {record.download_mbps > 0 ? record.download_mbps.toFixed(record.download_mbps >= 100 ? 1 : 2) : "--"}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Mbps</span>
                    </div>
                  </div>
                  <div className="text-right text-[11px] font-numeric text-zinc-400">
                    {record.download_mbps > 0 ? `~${(record.download_mbps / 8).toFixed(1)} MB/s` : ""}
                  </div>
                </div>

                {/* Upload */}
                <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-white/[0.03] border border-cyan-500/20 dark:border-cyan-500/20 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{t.upload}</span>
                    </div>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-3xl sm:text-4xl font-black font-numeric text-zinc-900 dark:text-white">
                        {record.upload_mbps > 0 ? record.upload_mbps.toFixed(record.upload_mbps >= 100 ? 1 : 2) : "--"}
                      </span>
                      <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">Mbps</span>
                    </div>
                  </div>
                  <div className="text-right text-[11px] font-numeric text-zinc-400">
                    {record.upload_mbps > 0 ? `~${(record.upload_mbps / 8).toFixed(1)} MB/s` : ""}
                  </div>
                </div>
              </div>

              {/* Latency & Stability Grid */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                    {t.minPing}
                  </span>
                  <span className="text-base sm:text-lg font-bold font-numeric text-cyan-600 dark:text-cyan-400">
                    {record.ping_ms > 0 ? `${record.ping_ms.toFixed(1)} ms` : "--"}
                  </span>
                </div>

                <div className="p-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                    {t.avgPing}
                  </span>
                  <span className="text-base sm:text-lg font-bold font-numeric text-zinc-800 dark:text-zinc-200">
                    {record.avg_ping_ms > 0 ? `${record.avg_ping_ms.toFixed(1)} ms` : "--"}
                  </span>
                </div>

                <div className="p-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                    {t.jitter}
                  </span>
                  <span className="text-base sm:text-lg font-bold font-numeric text-zinc-800 dark:text-zinc-200">
                    {record.jitter_ms > 0 ? `${record.jitter_ms.toFixed(1)} ms` : "--"}
                  </span>
                </div>

                <div className="p-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                    {t.packetLoss}
                  </span>
                  <span className="text-base sm:text-lg font-bold font-numeric text-zinc-800 dark:text-zinc-200">
                    {`${record.packet_loss.toFixed(1)}%`}
                  </span>
                </div>
              </div>

              {/* Network Details & Metadata */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-zinc-200/60 dark:border-white/5">
                  <div className="flex items-center space-x-2 text-zinc-500">
                    <User className="w-3.5 h-3.5" />
                    <span>{t.isp}</span>
                  </div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 max-w-[60%] text-right truncate">
                    {record.isp || "未知网络运营商"}
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-zinc-200/60 dark:border-white/5">
                  <div className="flex items-center space-x-2 text-zinc-500">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{t.myIp} / {t.location}</span>
                  </div>
                  <div className="font-numeric text-zinc-900 dark:text-zinc-100 max-w-[65%] text-right truncate">
                    <span>{record.masked_ip}</span>
                    {location && <span className="text-zinc-400 ml-1.5 font-sans">({location})</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-zinc-200/60 dark:border-white/5">
                  <div className="flex items-center space-x-2 text-zinc-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{t.testTime || "测速时间"}</span>
                  </div>
                  <div className="font-numeric text-zinc-700 dark:text-zinc-300">
                    {timeFormatted}
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-zinc-500">{t.testRecordId || "测速记录 ID"}</span>
                  <code className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">
                    {record.id}
                  </code>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        {record && (
          <div className="pt-3 sm:pt-4 border-t border-zinc-200/60 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-zinc-400" />}
              <span>{copied ? (t.copied || "已复制到剪贴板") : (t.copyLink || "复制分享链接")}</span>
            </button>

            <button
              onClick={handleStartOwnTest}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 rounded-full text-xs font-bold text-zinc-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.startOwnTest || "我也要测速"}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

