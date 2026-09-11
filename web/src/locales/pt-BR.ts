import type { Translations } from "./zh-CN";

export const ptBR: Translations = {
  title: "SpeedGo",
  tagline: "Ultrarrápido · Baixo uso de memória · Teste contínuo de estabilidade",
  startTest: "Iniciar Teste",
  testing: "Testando...",
  restartTest: "Testar Novamente",
  abortTest: "Cancelar",
  go: "GO",

  // Navegação
  results: "RESULTADOS",
  settings: "CONFIGURAÇÕES",
  client: "Cliente",
  themeLight: "Modo Claro",
  themeDark: "Modo Escuro",

  // Fases
  phaseReady: "Pronto para iniciar",
  phasePing: "Medindo latência e jitter...",
  phaseDownload: "Testando velocidade de download...",
  phaseUpload: "Testando velocidade de upload...",
  phaseFinished: "Teste concluído",

  // Métricas
  download: "Download",
  upload: "Upload",
  ping: "Ping",
  jitter: "Jitter",
  worstPing: "Pior Ping",
  avgPing: "Ping Médio",
  minPing: "Melhor Ping",
  packetLoss: "Perda",
  disconnects: "Desconexões",

  // Ping Contínuo
  continuousPingTitle: "Monitoramento Contínuo de Ping e Estabilidade",
  continuousPingDesc: "Sonda bidirecional em tempo real e detecção de perda via WebSocket",
  startContinuousPing: "Iniciar Monitor",
  stopContinuousPing: "Parar Monitor",

  // Informações de Rede
  networkInfo: "Informações de Rede",
  myIp: "IP Público",
  location: "Localização",
  isp: "Provedor / ISP",
  lanWarning: "Conectado via rede local privada (LAN)",

  // Histórico
  history: "Histórico",
  myHistory: "Meus Testes",
  publicHistory: "Feed Público",
  emptyHistory: "Nenhum histórico encontrado",
  close: "Fechar",

  // CLI
  cliTitle: "Speedtest via Terminal CLI",
  cliDesc: "Para servidores Linux sem interface gráfica ou roteadores:",
  copied: "Copiado para a área de transferência",
  copyCmd: "Copiar Comando",
};

