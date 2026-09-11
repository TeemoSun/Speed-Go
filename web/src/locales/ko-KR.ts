import type { Translations } from "./zh-CN";

export const koKR: Translations = {
  title: "SpeedGo",
  startTest: "측정 시작",
  testing: "측정 중...",
  restartTest: "다시 측정",
  abortTest: "중단",
  go: "GO",

  // 네비게이션
  results: "측정 결과",
  settings: "설정",
  client: "클라이언트",
  themeLight: "라이트 모드",
  themeDark: "다크 모드",

  // 단계
  phaseReady: "측정 준비 완료",
  phasePing: "지연 시간 및 지터 측정 중...",
  phaseDownload: "다운로드 속도 측정 중...",
  phaseUpload: "업로드 속도 측정 중...",
  phaseFinished: "측정 완료",

  // 측정치
  download: "다운로드",
  upload: "업로드",
  ping: "지연시간 (Ping)",
  jitter: "지터",
  worstPing: "최대 지연",
  avgPing: "평균 지연",
  minPing: "최소 지연",
  packetLoss: "패킷 손실률",
  disconnects: "연결 끊김",

  // 연속 Ping
  continuousPingTitle: "연속 Ping 네트워크 안정성 실시간 모니터링",
  continuousPingDesc: "WebSocket 양방향 연결을 통해 실시간 RTT 및 패킷 유실을 고빈도로 탐지",
  startContinuousPing: "모니터링 시작",
  stopContinuousPing: "모니터링 중지",

  // 네트워크 정보
  networkInfo: "네트워크 정보",
  myIp: "공인 IP",
  location: "위치",
  isp: "인터넷 서비스 제공자 (ISP)",
  lanWarning: "사설망 또는 LAN으로 접속 중",

  // 기록
  history: "측정 기록",
  myHistory: "내 기록",
  publicHistory: "전체 기록",
  emptyHistory: "측정 기록이 없습니다",
  close: "닫기",

  // CLI
  cliTitle: "터미널 CLI 속도측정",
  cliDesc: "GUI가 없는 Linux 서버 또는 라우터에서 바로 실행:",
  copied: "클립보드에 복사되었습니다",
  copyCmd: "명령어 복사",
};

