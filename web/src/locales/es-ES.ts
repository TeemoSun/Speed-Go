import type { Translations } from "./zh-CN";

export const esES: Translations = {
  title: "SpeedGo",
  tagline: "Ultrarrápido · Bajo consumo de memoria · Test de estabilidad en tiempo real",
  startTest: "Iniciar test",
  testing: "Probando...",
  restartTest: "Probar de nuevo",
  abortTest: "Cancelar",
  go: "GO",

  // Navegación
  results: "RESULTADOS",
  settings: "AJUSTES",
  connections: "Conexiones",
  multi: "Múltiple",
  single: "Única",
  server: "Servidor",
  client: "Cliente",
  changeServer: "Cambiar servidor",
  themeLight: "Modo claro",
  themeDark: "Modo oscuro",

  // Fases
  phaseReady: "Listo para iniciar",
  phasePing: "Midiendo latencia y jitter...",
  phaseDownload: "Probando velocidad de descarga...",
  phaseUpload: "Probando velocidad de subida...",
  phaseFinished: "Test completado",

  // Métricas
  download: "Descarga",
  upload: "Subida",
  ping: "Ping",
  jitter: "Jitter",
  worstPing: "Ping máx.",
  avgPing: "Ping medio",
  minPing: "Ping mín.",
  packetLoss: "Pérdida",
  disconnects: "Desconexiones",

  // Ping continuo
  continuousPingTitle: "Monitor continuo de Ping y estabilidad de red",
  continuousPingDesc: "Sonda bidireccional de RTT en tiempo real y detección de cortes vía WebSocket",
  startContinuousPing: "Iniciar monitor",
  stopContinuousPing: "Detener monitor",

  // Información de red
  networkInfo: "Información de red",
  myIp: "IP pública",
  location: "Ubicación",
  isp: "Proveedor / ISP",
  lanWarning: "Conectado mediante red local (LAN)",

  // Historial
  history: "Historial",
  myHistory: "Mis pruebas",
  publicHistory: "Historial global",
  emptyHistory: "No hay registros de pruebas",
  close: "Cerrar",

  // CLI
  cliTitle: "Speedtest por consola CLI",
  cliDesc: "Para servidores Linux sin interfaz o routers, ejecuta:",
  copied: "Copiado al portapapeles",
  copyCmd: "Copiar comando",
};

