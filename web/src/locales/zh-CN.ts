export const zhCN = {
  title: "SpeedGo",
  startTest: "开始测速",
  testing: "正在测速中...",
  restartTest: "重新开始",
  abortTest: "中止测试",
  go: "GO",
  results: "测速记录",
  settings: "高级设置",
  client: "本地网络",
  themeLight: "浅色模式",
  themeDark: "深色模式",
  phaseReady: "准备就绪",
  phasePing: "正在探测网络延迟与抖动...",
  phaseDownload: "正在测试下载带宽...",
  phaseUpload: "正在测试上传带宽...",
  phaseFinished: "测速完成",
  stagePingTooltip: "阶段 1: 延迟 Ping",
  stageDownloadTooltip: "阶段 2: 下载带宽 Download",
  stageUploadTooltip: "阶段 3: 上传带宽 Upload",
  download: "下载带宽",
  upload: "上传带宽",
  ping: "网络延迟",
  jitter: "网络抖动",
  worstPing: "最差延迟",
  avgPing: "平均延迟",
  minPing: "最优延迟",
  packetLoss: "丢包率",
  disconnects: "断连次数",
  pingJitter: "延迟 / 抖动",
  continuousPingTitle: "连续 Ping 网络稳定性实时监测",
  continuousPingDesc: "通过全双工 WebSocket 长连接高频探测链路真实往返时延（RTT）与瞬时断线",
  continuousPingProbing: "正在持续探测链路...",
  continuousPingPrompt: "点击右上角启动连续探测",
  startContinuousPing: "开启连续监测",
  stopContinuousPing: "停止监测",
  disconnectWarning: "探测期间检测到网络异常断开 {count} 次",
  networkInfo: "网络环境",
  myIp: "公网 IP",
  location: "节点归属",
  isp: "网络运营商",
  lanWarning: "当前为局域网或私网 IP 访问",
  unknownIsp: "未知网络运营商",
  unknownLocation: "未知地理位置",
  resolving: "正在解析...",
  history: "测速记录",
  historySubtitle: "查看本机测试历史与全网最新公开测速成绩",
  myHistory: "我的记录",
  publicHistory: "全网动态",
  emptyHistory: "暂无测速记录",
  loadingHistory: "加载历史记录中...",
  close: "关闭",
  cliTitle: "命令行终端快速测速",
  cliDesc: "无图形界面的 Linux 服务器、软路由或终端，直接执行：",
  copied: "已复制到剪贴板",
  copyCmd: "复制命令",
  share: "分享结果",
  shareTitle: "测速报告",
  shareSubtitle: "查看与分享该次测速的详细网络指标与网络环境",
  testRecordId: "测速记录 ID",
  testTime: "测速时间",
  testTerminal: "测试终端",
  copyLink: "复制分享链接",
  startOwnTest: "我也要测速",
  recordNotFound: "未找到该测速记录，可能已被清理或 ID 输入有误",
  recordNotFoundDesc: "测速记录可能已被定期清理，或者链接中包含的 ID 不正确。",
  cliTerminal: "CLI 命令行终端",
  webTerminal: "Web 网页端",
  loadingReport: "正在解析测速报告...",
  loadFailed: "加载记录失败",
  footerSlogan: "现代化高吞吐轻量网络测速系统",
  githubSource: "GitHub 源码",
};

export interface Translations {
  title: string;
  startTest: string;
  testing: string;
  restartTest: string;
  abortTest: string;
  go: string;
  results: string;
  settings: string;
  client: string;
  themeLight: string;
  themeDark: string;
  phaseReady: string;
  phasePing: string;
  phaseDownload: string;
  phaseUpload: string;
  phaseFinished: string;
  stagePingTooltip: string;
  stageDownloadTooltip: string;
  stageUploadTooltip: string;
  download: string;
  upload: string;
  ping: string;
  jitter: string;
  worstPing: string;
  avgPing: string;
  minPing: string;
  packetLoss: string;
  disconnects: string;
  pingJitter: string;
  continuousPingTitle: string;
  continuousPingDesc: string;
  continuousPingProbing: string;
  continuousPingPrompt: string;
  startContinuousPing: string;
  stopContinuousPing: string;
  disconnectWarning: string;
  networkInfo: string;
  myIp: string;
  location: string;
  isp: string;
  lanWarning: string;
  unknownIsp: string;
  unknownLocation: string;
  resolving: string;
  history: string;
  historySubtitle: string;
  myHistory: string;
  publicHistory: string;
  emptyHistory: string;
  loadingHistory: string;
  close: string;
  cliTitle: string;
  cliDesc: string;
  copied: string;
  copyCmd: string;
  share: string;
  shareTitle: string;
  shareSubtitle: string;
  testRecordId: string;
  testTime: string;
  testTerminal: string;
  copyLink: string;
  startOwnTest: string;
  recordNotFound: string;
  recordNotFoundDesc: string;
  cliTerminal: string;
  webTerminal: string;
  loadingReport: string;
  loadFailed: string;
  footerSlogan: string;
  githubSource: string;
}
