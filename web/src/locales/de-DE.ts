import type { Translations } from "./zh-CN";

export const deDE: Translations = {
  title: "SpeedGo",
  startTest: "Test starten",
  testing: "Messung läuft...",
  restartTest: "Erneut testen",
  abortTest: "Abbrechen",
  go: "GO",

  // Navigation
  results: "ERGEBNISSE",
  settings: "EINSTELLUNGEN",
  client: "Client",
  themeLight: "Heller Modus",
  themeDark: "Dunkler Modus",

  // Phasen
  phaseReady: "Bereit zum Testen",
  phasePing: "Latenz & Jitter werden gemessen...",
  phaseDownload: "Download-Geschwindigkeit wird gemessen...",
  phaseUpload: "Upload-Geschwindigkeit wird gemessen...",
  phaseFinished: "Test abgeschlossen",

  // Metriken
  download: "Download",
  upload: "Upload",
  ping: "Ping",
  jitter: "Jitter",
  worstPing: "Max. Ping",
  avgPing: "Durchschn. Ping",
  minPing: "Min. Ping",
  packetLoss: "Paketverlust",
  disconnects: "Abbrüche",

  // Kontinuierlicher Ping
  continuousPingTitle: "Kontinuierliche Ping- & Stabilitätsüberwachung",
  continuousPingDesc: "Echtzeit-RTT-Messung und Verbindungsausfallerkennung über WebSocket",
  startContinuousPing: "Überwachung starten",
  stopContinuousPing: "Überwachung stoppen",

  // Netzwerkinformationen
  networkInfo: "Netzwerkinformation",
  myIp: "Öffentliche IP",
  location: "Standort",
  isp: "Internetanbieter / ISP",
  lanWarning: "Über privates LAN verbunden",

  // Verlauf
  history: "Verlauf",
  myHistory: "Meine Tests",
  publicHistory: "Öffentlicher Feed",
  emptyHistory: "Keine Messergebnisse vorhanden",
  close: "Schließen",

  // CLI
  cliTitle: "Terminal CLI Geschwindigkeitstest",
  cliDesc: "Für Linux-Server, Router oder Headless-Systeme:",
  copied: "In die Zwischenablage kopiert",
  copyCmd: "Befehl kopieren",
};

