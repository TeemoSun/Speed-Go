import type { Translations } from "./zh-CN";

export const zhTW: Translations = {
  title: "SpeedGo",
  startTest: "開始測速",
  testing: "正在測速中...",
  restartTest: "重新開始",
  abortTest: "中止測試",
  go: "GO",

  // 頂部與二級功能
  results: "測速記錄",
  settings: "高級設定",
  client: "本地網路",
  themeLight: "淺色模式",
  themeDark: "深色模式",

  // 階段
  phaseReady: "準備就緒",
  phasePing: "正在探測網路延遲與抖動...",
  phaseDownload: "正在測試下載頻寬...",
  phaseUpload: "正在測試上傳頻寬...",
  phaseFinished: "測速完成",

  // 指標
  download: "下載頻寬",
  upload: "上傳頻寬",
  ping: "網路延遲",
  jitter: "網路抖動",
  worstPing: "最差延遲",
  avgPing: "平均延遲",
  minPing: "最優延遲",
  packetLoss: "封包遺失率",
  disconnects: "中斷次數",

  // 連續 Ping
  continuousPingTitle: "連續 Ping 網路穩定性即時監測",
  continuousPingDesc: "透過全雙工 WebSocket 長連接高頻探測鏈路真實往返時延（RTT）與瞬時斷線",
  startContinuousPing: "開啟連續監測",
  stopContinuousPing: "停止監測",

  // 網路資訊
  networkInfo: "網路環境",
  myIp: "公網 IP",
  location: "節點歸屬",
  isp: "網路電信業者",
  lanWarning: "目前為區域網路或私網 IP 存取",

  // 歷史
  history: "測速記錄",
  myHistory: "我的記錄",
  publicHistory: "全網動態",
  emptyHistory: "暫無測速記錄",
  close: "關閉",

  // CLI
  cliTitle: "命令列終端快速測速",
  cliDesc: "無圖形介面的 Linux 伺服器、軟路由或終端機，直接執行：",
  copied: "已複製到剪貼簿",
  copyCmd: "複製命令",

  // 測速報告與分享
  share: "分享結果",
  shareTitle: "測速報告",
  shareSubtitle: "查看與分享該次測速的詳細網路指標與網路環境",
  testRecordId: "測速記錄 ID",
  testTime: "測速時間",
  testTerminal: "測試終端",
  copyLink: "複製分享連結",
  startOwnTest: "我也要測速",
  recordNotFound: "未找到該測速記錄，可能已被清理或 ID 輸入有誤",
  cliTerminal: "CLI 命令列終端",
  webTerminal: "Web 網頁端",
};

