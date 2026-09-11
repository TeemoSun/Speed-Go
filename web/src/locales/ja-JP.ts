import type { Translations } from "./zh-CN";

export const jaJP: Translations = {
  title: "SpeedGo",
  startTest: "テスト開始",
  testing: "測定中...",
  restartTest: "再テスト",
  abortTest: "中止",
  go: "GO",

  // ナビゲーション
  results: "測定結果",
  settings: "設定",
  client: "クライアント",
  themeLight: "ライトモード",
  themeDark: "ダークモード",

  // フェーズ
  phaseReady: "準備完了",
  phasePing: "Pingとジッターを測定中...",
  phaseDownload: "ダウンロード速度を測定中...",
  phaseUpload: "アップロード速度を測定中...",
  phaseFinished: "測定完了",

  // メトリクス
  download: "ダウンロード",
  upload: "アップロード",
  ping: "Ping",
  jitter: "ジッター",
  worstPing: "最悪Ping",
  avgPing: "平均Ping",
  minPing: "最小Ping",
  packetLoss: "パケット損失",
  disconnects: "切断回数",

  // 連続Ping
  continuousPingTitle: "連続Ping ネットワーク安定性監視",
  continuousPingDesc: "WebSocket経由でリアルタイムRTTとパケットドロップを高頻度監視",
  startContinuousPing: "監視開始",
  stopContinuousPing: "監視停止",

  // ネットワーク情報
  networkInfo: "ネットワーク情報",
  myIp: "パブリックIP",
  location: "ロケーション",
  isp: "プロバイダ / ISP",
  lanWarning: "プライベートLAN経由で接続中",

  // 履歴
  history: "履歴",
  myHistory: "自分の履歴",
  publicHistory: "パブリック履歴",
  emptyHistory: "履歴がありません",
  close: "閉じる",

  // CLI
  cliTitle: "ターミナルCLIテスト",
  cliDesc: "GUIのないLinuxサーバーやルーター向け実行コマンド:",
  copied: "クリップボードにコピーしました",
  copyCmd: "コマンドをコピー",
};

