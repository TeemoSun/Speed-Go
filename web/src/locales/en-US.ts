import type { Translations } from "./zh-CN";

export const enUS: Translations = {
  title: "SpeedGo",
  startTest: "Start Test",
  testing: "Testing...",
  restartTest: "Test Again",
  abortTest: "Abort",
  go: "GO",

  // Navigation & Sub-nav
  results: "RESULTS",
  settings: "SETTINGS",
  client: "Client",
  themeLight: "Light Mode",
  themeDark: "Dark Mode",

  // Phases
  phaseReady: "Ready to Test",
  phasePing: "Measuring Ping & Jitter...",
  phaseDownload: "Testing Download Speed...",
  phaseUpload: "Testing Upload Speed...",
  phaseFinished: "Test Completed",

  // Metrics
  download: "Download",
  upload: "Upload",
  ping: "Ping",
  jitter: "Jitter",
  worstPing: "Worst Ping",
  avgPing: "Avg Ping",
  minPing: "Min Ping",
  packetLoss: "Loss Rate",
  disconnects: "Disconnects",

  // Continuous Ping
  continuousPingTitle: "Continuous Ping & Network Stability Monitor",
  continuousPingDesc: "Real-time bidirectional RTT probe and drop detection via WebSocket",
  startContinuousPing: "Start Monitor",
  stopContinuousPing: "Stop Monitor",

  // Network Info
  networkInfo: "Network Info",
  myIp: "Public IP",
  location: "Location",
  isp: "Provider / ISP",
  lanWarning: "Connected via Private / LAN network",

  // History
  history: "History",
  myHistory: "My Tests",
  publicHistory: "Public Feed",
  emptyHistory: "No speedtest records found",
  close: "Close",

  // CLI
  cliTitle: "Terminal CLI Speedtest",
  cliDesc: "For headless Linux servers, routers or terminals, run:",
  copied: "Copied to clipboard",
  copyCmd: "Copy Command",

  // Speedtest Report & Sharing
  share: "Share Result",
  shareTitle: "Speedtest Report",
  shareSubtitle: "Detailed benchmark metrics and network environment for this test",
  testRecordId: "Test Record ID",
  testTime: "Test Time",
  testTerminal: "Test Terminal",
  copyLink: "Copy Share Link",
  startOwnTest: "Start My Speedtest",
  recordNotFound: "Test record not found. It may have been cleared or the ID is incorrect.",
  cliTerminal: "CLI Terminal",
  webTerminal: "Web Browser",
};
