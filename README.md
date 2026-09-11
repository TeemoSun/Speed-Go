# SpeedGo (Speed-Go)

现代化、轻量化、极低内存占用的高性能网络测速系统。

---

## ✨ 核心特性

- **高性能 Go 流量引擎**：
  - **下载测速**：基于 8MB 不可压缩只读内存循环流，服务端**零堆内存分配（0-Allocation）**，单机单核轻松跑满万兆（10Gbps+）带宽；
  - **上传测速**：基于 `sync.Pool` 32KB 缓冲与 `io.Discard` 流式抛弃，服务端单连接内存恒定在 **32KB** 以内；
  - **客户端防爆内存**：前端全面采用 Fetch API `ReadableStream` 流式读取，随读随销，彻底终结传统 XHR 内存暴涨至 500MB 的历史，万兆测速下浏览器内存稳定保持在 **<20MB**。
- **连续 Ping 与网络稳定性长时监控**：
  - 基于全双工 WebSocket 长连接，200ms 高频双向毫秒级时间戳探针；
  - 实时统计并展示：**当前延迟、最低延迟、最差延迟、平均延迟、加权抖动（Jitter）、丢包率及断网重连次数**；
  - 前端基于 Canvas 动态绘制 60 秒平滑时序折线，红点直观标明丢包与瞬时抖动。
- **命令行终端（CLI）交互式测速**：
  - 无需安装任何客户端，无图形界面的 Linux 服务器或路由器直接执行：
    ```bash
    curl -sL http://your-speedtest-domain.com/cli | bash
    ```
  - 纯 ANSI 彩色交互式菜单、动态平滑终端进度条与最终格式化测速简报，并自动回传成绩至服务器。
- **离线 IP 库与脱敏**：
  - 穿透 Cloudflare / Nginx 反向代理，支持私网（LAN）与回环自动识别；
  - 基于 MaxMind MMDB 离线库毫秒级解析国家、省市、运营商（ISP/ASN），**零外部网络 API 依赖**；
  - 全网公开测试记录与历史记录强制实行敏感 IP 中间段脱敏（如 `114.***.***.12`）。
- **双层持久化与 Cookie 设备绑定**：
  - 浏览器 Cookie 仅存长效设备唯一 Token `speed_client_uuid`（<100 字节，避免 Cookie 4KB 溢出）；
  - 基于 **Pure-Go SQLite**（免 CGO 交叉编译），启用 WAL 模式高并发读写，区分“我的历史记录”与“全网公共脱敏记录”。
- **现代化 React 19 + Tailwind CSS + 大圆角 UI**：
  - 采用现代科技感圆角磨砂设计规范（`rounded-2xl` / `rounded-3xl`）；
  - 平滑渐变高帧率 SVG 环形表盘、暗黑模式美学；
  - 智能多语言体系（Cookie 优先 -> GeoIP 推荐 -> 浏览器 Header -> en-US），支持右上角即时无刷新热切换。
- **单二进制（Single Binary）零依赖分发**：
  - 编译后的 React 前端通过 Go `//go:embed` 直接内嵌到单一二进制文件中，单文件大小仅 **~15MB**，随拷随跑。

---

## 🚀 快速启动

### 方式一：直接运行二进制
```bash
# 1. 编译 (已内置 React 静态前端)
go build -o speedgo ./cmd/speedgo

# 2. 运行
./speedgo --port 8080 --db ./data/speedgo.db
```
浏览器访问：`http://localhost:8080`

### 方式二：Docker 容器运行
```bash
docker run -d \
  --name speedgo \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  ghcr.io/teemosun/speed-go:latest
```

---

## 💻 命令行 (CLI) 终端使用

在任何支持 `curl` 与 `bash` 的终端上执行：
```bash
curl -sL http://your-server-ip:8080/cli | bash
```
支持通过命令行直接跳过菜单执行特定测试：
- 全面测速（默认）：`curl -sL http://your-server:8080/cli | bash -s -- 1`
- 仅测试网络延迟与抖动：`curl -sL http://your-server:8080/cli | bash -s -- 2`
- 仅测试下载带宽：`curl -sL http://your-server:8080/cli | bash -s -- 3`
- 仅测试上传带宽：`curl -sL http://your-server:8080/cli | bash -s -- 4`

---

## 🛠️ 本地前端开发与调试

```bash
# 进入前端源码目录
cd web

# 安装依赖
npm install

# 启动本地热重载调试 (自动代理 API 与 WebSocket 到 8080)
npm run dev

# 重新构建前端静态产物
npm run build
```

---

## 📄 License
[MIT License](LICENSE)
