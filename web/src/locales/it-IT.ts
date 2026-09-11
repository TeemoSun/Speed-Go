import type { Translations } from "./zh-CN";

export const itIT: Translations = {
  title: "SpeedGo",
  tagline: "Ultraveloce · Basso consumo di memoria · Monitoraggio continuo della stabilità",
  startTest: "Inizia Test",
  testing: "Test in corso...",
  restartTest: "Ripeti Test",
  abortTest: "Interrompi",
  go: "GO",

  // Navigazione
  results: "RISULTATI",
  settings: "IMPOSTAZIONI",
  connections: "Connessioni",
  multi: "Multipla",
  single: "Singola",
  server: "Server",
  client: "Client",
  changeServer: "Cambia Server",
  themeLight: "Modalità Chiara",
  themeDark: "Modalità Scura",

  // Fasi
  phaseReady: "Pronto per il test",
  phasePing: "Misurazione di latenza e jitter...",
  phaseDownload: "Test velocità di download...",
  phaseUpload: "Test velocità di upload...",
  phaseFinished: "Test completato",

  // Metriche
  download: "Download",
  upload: "Upload",
  ping: "Ping",
  jitter: "Jitter",
  worstPing: "Ping Peggiore",
  avgPing: "Ping Medio",
  minPing: "Ping Minimo",
  packetLoss: "Perdita pacchetti",
  disconnects: "Disconnessioni",

  // Ping continuo
  continuousPingTitle: "Monitoraggio continuo Ping e stabilità di rete",
  continuousPingDesc: "Sonda RTT bidirezionale in tempo reale e rilevamento cadute tramite WebSocket",
  startContinuousPing: "Avvia Monitoraggio",
  stopContinuousPing: "Ferma Monitoraggio",

  // Informazioni di rete
  networkInfo: "Info Rete",
  myIp: "IP Pubblico",
  location: "Posizione",
  isp: "Operatore / ISP",
  lanWarning: "Connesso tramite rete locale privata (LAN)",

  // Cronologia
  history: "Cronologia",
  myHistory: "I Miei Test",
  publicHistory: "Feed Pubblico",
  emptyHistory: "Nessun record trovato",
  close: "Chiudi",

  // CLI
  cliTitle: "Speedtest da terminale CLI",
  cliDesc: "Per server Linux headless o router, esegui:",
  copied: "Copiato negli appunti",
  copyCmd: "Copia comando",
};

