<div align="center">

<img src="docs/images/logo.svg" width="88" alt="SpeedGo Logo"/>

# SpeedGo

**A modern, lightweight, ultra-low-memory, high-performance network speed test system**

[![Go](https://img.shields.io/badge/Go-1.23-00ADD8?logo=go&logoColor=white)](https://go.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io-2496ED?logo=docker&logoColor=white)](https://github.com/TeemoSun/Speed-Go/pkgs/container/speed-go)
[![License](https://img.shields.io/badge/License-MIT-3fb950)](./LICENSE)

[简体中文](./README.md) | [English](./README.en.md)

</div>

---

📸 **Screenshots**

| 🌞 Light Mode | 🌙 Dark Mode |
| :---: | :---: |
| ![SpeedGo Web Light](docs/images/screenshot-web-light.svg) | ![SpeedGo Web Dark](docs/images/screenshot-web-dark.svg) |

| 💻 Terminal CLI |
| :---: |
| ![SpeedGo CLI](docs/images/screenshot-cli.svg) |

---

## ✨ Features

### 🚄 High-Performance Go Traffic Engine

- **Download**: powered by an 8MB incompressible read-only memory ring buffer with **zero heap allocation** on the server — a single core can saturate a 10Gbps+ link;
- **Upload**: `sync.Pool` 32KB buffers streamed straight into `io.Discard`, keeping per-connection server memory under **32KB**;
- **Browser memory safety**: the frontend streams data via the Fetch API `ReadableStream` (read-and-discard), keeping browser memory **below 20MB** even during gigabit tests — no more XHR memory bloat.

### 📈 Continuous Ping & Stability Monitoring

- Full-duplex WebSocket connection with high-frequency (200ms) millisecond-timestamp probes;
- Real-time stats: **current / min / worst / average latency, weighted jitter, packet loss, disconnect count**;
- Smooth 60-second Canvas timeline with red dots marking packet loss and spikes.

### 💻 Interactive CLI Speed Test

- No client installation required — one command on any Linux server or router:
  ```bash
  curl -sL http://your-speedtest-domain.com/cli | bash
  ```
- Pure ANSI colored menu, smooth terminal progress bar, formatted summary report, results automatically uploaded back to the server.

### 🛡️ Offline IP Database & Privacy

- Built-in MaxMind MMDB offline database resolves country, region, city and ISP/ASN in milliseconds with **zero external API calls**;
- See through Cloudflare / Nginx reverse proxies; auto-detects LAN and loopback clients;
- IPs are always masked in history and public records (e.g. `114.***.***.12`, `2409:8a20:****:****::288e`).

### 💾 Persistence & Device Binding

- Cookies store only a sub-100-byte device token — no 4KB cookie overflow;
- **Pure-Go SQLite** (no CGO cross-compile hassle) in high-concurrency WAL mode;
- Separates "my history" from "public masked records", with one-click result sharing.

### 🎨 Modern Web UI

- React 19 + Tailwind CSS, rounded glassmorphism design with dark mode;
- 12 languages with smart detection (Cookie → GeoIP suggestion → browser language) and instant hot-switching;
- The frontend is embedded via `go:embed` into a **single ~15MB binary — copy and run**.

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
mkdir -p data && cat > docker-compose.yml <<'EOF'
services:
  speedgo:
    image: ghcr.io/teemosun/speed-go:latest
    container_name: speedgo
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./data:/data          # SQLite persistence
    environment:
      - TZ=Asia/Shanghai
      # Set to true when behind a trusted reverse proxy (Nginx / Cloudflare)
      - SPEEDGO_TRUST_PROXY=false
      # Public base URL used by the CLI script (optional)
      # - SPEEDGO_PUBLIC_URL=https://speed.example.com
EOF

docker compose up -d
```

> [!TIP]
> To upgrade, just run `docker compose pull && docker compose up -d` — history stored in the mounted `./data` directory is untouched.

### Option 2: Docker CLI

```bash
docker run -d \
  --name speedgo \
  -p 8080:8080 \
  -v $(pwd)/data:/data \
  -e TZ=Asia/Shanghai \
  -e SPEEDGO_TRUST_PROXY=false \
  --restart unless-stopped \
  ghcr.io/teemosun/speed-go:latest
```

### Option 3: Build from Source

```bash
go build -o speedgo ./cmd/speedgo
./speedgo --port 8080 --db ./data/speedgo.db
```

Then open `http://your-server-ip:8080` and start testing.

---

## ⚙️ Configuration

Configure via **environment variables** (Docker `environment` / `.env`) or **command-line flags**:

| Environment Variable | Flag | Default | Description |
| :--- | :--- | :--- | :--- |
| `SPEEDGO_PORT` | `--port` | `8080` | HTTP listen port |
| `SPEEDGO_DB` | `--db` | `./data/speedgo.db` | SQLite database path (`/data/speedgo.db` in container) |
| `SPEEDGO_TRUST_PROXY` | `--trust-proxy` | `false` | Set to `true` behind a trusted reverse proxy to resolve real client IPs |
| `SPEEDGO_PUBLIC_URL` | `--public-url` | empty | Public base URL; the CLI script connects to it first |
| `SPEEDGO_MAX_TIME` | `--max-time` | `30` | Per-phase safety timeout (seconds) |
| `SPEEDGO_MAX_CHUNK` | `--max-chunk` | `512` | Max download chunk size (MB) |
| `SPEEDGO_CORS` | `--cors` | `true` | Enable global CORS headers |
| `TZ` | - | `Asia/Shanghai` | Container timezone |

---

## 💻 CLI Usage

```bash
curl -sL http://your-server-ip:8080/cli | bash
```

Skip the menu and run a specific task directly:

```bash
curl -sL http://your-server:8080/cli | bash -s -- 1   # Full test (default)
curl -sL http://your-server:8080/cli | bash -s -- 2   # Latency & jitter only
curl -sL http://your-server:8080/cli | bash -s -- 3   # Download only
curl -sL http://your-server:8080/cli | bash -s -- 4   # Upload only
```

---

## 🛠️ Local Development

```bash
git clone https://github.com/TeemoSun/Speed-Go.git
cd Speed-Go

# Frontend dev server (hot reload, API proxied to :8080)
cd web && npm install && npm run dev

# Build frontend assets, then compile the Go binary (embedded via go:embed)
cd web && npm run build && cd .. && go build -o speedgo ./cmd/speedgo
```

## 🤝 Contributing

Issues and Pull Requests are welcome at [Issues](https://github.com/TeemoSun/Speed-Go/issues)!

## 📄 License

[MIT](./LICENSE) © 2026 TeemoSun
