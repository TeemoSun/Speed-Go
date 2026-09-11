import type { Translations } from "./zh-CN";

export const ruRU: Translations = {
  title: "SpeedGo",
  tagline: "Сверхбыстрый · Экономия памяти · Мониторинг стабильности сети",
  startTest: "Начать тест",
  testing: "Тестирование...",
  restartTest: "Повторить тест",
  abortTest: "Прервать",
  go: "GO",

  // Навигация
  results: "РЕЗУЛЬТАТЫ",
  settings: "НАСТРОЙКИ",
  client: "Клиент",
  themeLight: "Светлая тема",
  themeDark: "Тёмная тема",

  // Этапы
  phaseReady: "Готов к тестированию",
  phasePing: "Измерение задержки и джиттера...",
  phaseDownload: "Тестирование скорости загрузки...",
  phaseUpload: "Тестирование скорости отдачи...",
  phaseFinished: "Тест завершён",

  // Показатели
  download: "Скачать",
  upload: "Загрузить",
  ping: "Пинг",
  jitter: "Джиттер",
  worstPing: "Худший пинг",
  avgPing: "Средний пинг",
  minPing: "Мин. пинг",
  packetLoss: "Потери",
  disconnects: "Обрывы",

  // Непрерывный пинг
  continuousPingTitle: "Непрерывный мониторинг стабильности сети",
  continuousPingDesc: "Высокочастотный замер RTT и потерь пакетов через WebSocket",
  startContinuousPing: "Запустить мониторинг",
  stopContinuousPing: "Остановить мониторинг",

  // Информация о сети
  networkInfo: "Информация о сети",
  myIp: "Публичный IP",
  location: "Локация",
  isp: "Провайдер / ISP",
  lanWarning: "Подключение через локальную сеть (LAN)",

  // История
  history: "История",
  myHistory: "Мои тесты",
  publicHistory: "Общая лента",
  emptyHistory: "История тестов пуста",
  close: "Закрыть",

  // CLI
  cliTitle: "Speedtest в командной строке",
  cliDesc: "Для Linux-серверов или маршрутизаторов выполните:",
  copied: "Скопировано в буфер обмена",
  copyCmd: "Копировать команду",
};

