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

## 🚀 部署与快速启动

### 方式一：Docker Compose 部署 (推荐)

使用 Docker Compose 是最推荐的生产部署方式。它能便捷地实现**拉取最新镜像**、**SQLite 数据库外部持久化**与**容器健康自愈**。

#### 1. 准备持久化目录与配置文件
在宿主机的工作目录下创建 `data` 数据目录与 `docker-compose.yml` 配置文件：

```bash
mkdir -p data
```

创建 `docker-compose.yml`：
```yaml
services:
  speedgo:
    image: ghcr.io/teemosun/speed-go:latest
    container_name: speedgo
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      # 将宿主机的 ./data 目录挂载到容器的 /data，用于 SQLite 数据库持久化
      - ./data:/data
    environment:
      # 容器运行时区
      - TZ=Asia/Shanghai
      # 反向代理信任开关：当置于 Nginx / Cloudflare 等反向代理后时务必设为 true，以正确解析客户端真实 IP
      - SPEEDGO_TRUST_PROXY=false
      # 服务的公网基础访问地址（例如 https://speed.example.com，用于 CLI 测速脚本获取服务端基准地址）
      # - SPEEDGO_PUBLIC_URL=https://speed.example.com
      # 单次测速最大超时时间与单分块上限（可选，默认 30 秒 / 512MB）
      # - SPEEDGO_MAX_TIME=30
      # - SPEEDGO_MAX_CHUNK=512
    # 若希望使用独立的 .env 文件管理变量，亦可取消以下注释：
    # env_file:
    #   - .env
```

> [!TIP]
> **关于 Docker 环境下的 `.env` 配置**：
> 在 Docker 容器化部署中，宿主机的 `.env` 文件默认不会直接进入容器内部。推荐直接在 `docker-compose.yml` 的 `environment:` 段中配置环境变量；若习惯使用外部 `.env` 文件，只需在服务下声明 `env_file: [.env]`，Docker Compose 就会自动将配置项批量注入容器。

> [!TIP]
> **SQLite 持久化说明**：
> SpeedGo 默认使用高性能 SQLite WAL 模式（Write-Ahead Logging），数据读写时除 `speedgo.db` 主文件外，还会动态生成 `-wal` 和 `-shm` 临时索引文件。
> 通过将宿主机的 `./data` 目录映射到容器的 `/data`，SQLite 数据库将保存在宿主机当前目录下的 `data/speedgo.db`。容器停止、重建或镜像版本升级时，所有测速历史记录与设备唯一标识均完整保留在外部宿主机中。

#### 2. 拉取镜像与启动容器

配置完成后，依次执行以下命令：

```bash
# 1. 从 GitHub Container Registry 拉取最新镜像
docker compose pull

# 2. 在后台启动容器
docker compose up -d

# 3. 检查容器运行状态与健康检查探针
docker compose ps

# 4. 查看实时运行日志
docker compose logs -f
```

容器启动成功后，在浏览器访问 `http://你的服务器IP:8080` 即可开始测速。

#### 3. 后续升级与维护
当有新版本发布时，只需在 `docker-compose.yml` 所在目录执行：
```bash
# 拉取最新镜像并平滑重启容器（历史数据完全不受影响）
docker compose pull && docker compose up -d
```

---

### 方式二：Docker CLI 直接运行

如果你习惯直接使用 `docker` 命令行：

```bash
# 1. 创建本地持久化目录
mkdir -p data

# 2. 拉取最新镜像
docker pull ghcr.io/teemosun/speed-go:latest

# 3. 启动容器 (通过 -v 挂载持久化目录，-e 传入环境变量)
docker run -d \
  --name speedgo \
  -p 8080:8080 \
  -v $(pwd)/data:/data \
  -e TZ=Asia/Shanghai \
  -e SPEEDGO_TRUST_PROXY=false \
  --restart unless-stopped \
  ghcr.io/teemosun/speed-go:latest
```

---

### 方式三：直接运行独立二进制

如果你希望在本地或 Linux 服务器直接运行单一二进制文件：

```bash
# 1. 编译二进制 (已内置 React 生产静态资源)
go build -o speedgo ./cmd/speedgo

# 2. 运行并指定外部 SQLite 数据库路径
./speedgo --port 8080 --db ./data/speedgo.db
```
浏览器访问：`http://localhost:8080`

---

### ⚙️ 服务端配置参数说明

SpeedGo 支持通过**环境变量**（Docker `environment` / `.env` 文件）或**命令行标志**灵活配置：

| 环境变量 | 命令行标志 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `SPEEDGO_PORT` | `--port` | `8080` | HTTP 服务监听端口 |
| `SPEEDGO_DB` | `--db` | `./data/speedgo.db` | SQLite 数据库文件路径（容器内为 `/data/speedgo.db`） |
| `SPEEDGO_TRUST_PROXY` | `--trust-proxy` | `false` | **反代信任安全开关**：当服务置于 Nginx/Cloudflare 等受信任反向代理后时设为 `true`，以正确解析客户端真实 IP；公网直连时保持 `false` 防范 IP 伪造 |
| `SPEEDGO_PUBLIC_URL` | `--public-url` | 空 | 服务的公网基础访问地址（如 `https://speed.example.com`），CLI 测速脚本将优先以此地址为基准 |
| `SPEEDGO_MAX_TIME` | `--max-time` | `30` | 测速单阶段最大保护超时时间（秒） |
| `SPEEDGO_MAX_CHUNK` | `--max-chunk` | `512` | 单次下载分块最大安全上限（MB） |
| `SPEEDGO_CORS` | `--cors` | `true` | 是否开启全局 CORS 跨域标头 |
| `TZ` | - | `Asia/Shanghai` | 容器运行时区 |

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
