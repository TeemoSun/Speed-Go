import type { Translations } from "./zh-CN";

export const frFR: Translations = {
  title: "SpeedGo",
  tagline: "Ultra-rapide · Faible empreinte mémoire · Test de stabilité en temps réel",
  startTest: "Lancer le test",
  testing: "Test en cours...",
  restartTest: "Recommencer",
  abortTest: "Arrêter",
  go: "GO",

  // Navigation
  results: "RÉSULTATS",
  settings: "PARAMÈTRES",
  client: "Client",
  themeLight: "Mode clair",
  themeDark: "Mode sombre",

  // Phases
  phaseReady: "Prêt pour le test",
  phasePing: "Mesure de la latence et du jitter...",
  phaseDownload: "Test de téléchargement...",
  phaseUpload: "Test d'envoi...",
  phaseFinished: "Test terminé",

  // Métriques
  download: "Descendant",
  upload: "Ascendant",
  ping: "Latence",
  jitter: "Jitter",
  worstPing: "Ping max",
  avgPing: "Ping moyen",
  minPing: "Ping min",
  packetLoss: "Perte de paquets",
  disconnects: "Déconnexions",

  // Ping continu
  continuousPingTitle: "Surveillance continue du Ping et stabilité réseau",
  continuousPingDesc: "Sonde RTT bidirectionnelle et détection des coupures via WebSocket",
  startContinuousPing: "Démarrer la surveillance",
  stopContinuousPing: "Arrêter la surveillance",

  // Informations réseau
  networkInfo: "Informations réseau",
  myIp: "IP publique",
  location: "Localisation",
  isp: "Fournisseur / FAI",
  lanWarning: "Connecté via un réseau local privé (LAN)",

  // Historique
  history: "Historique",
  myHistory: "Mes tests",
  publicHistory: "Flux public",
  emptyHistory: "Aucun historique disponible",
  close: "Fermer",

  // CLI
  cliTitle: "Speedtest en ligne de commande",
  cliDesc: "Pour serveurs Linux sans interface graphique ou routeurs :",
  copied: "Copié dans le presse-papier",
  copyCmd: "Copier la commande",
};

