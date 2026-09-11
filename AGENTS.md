# AGENTS.md — SpeedGo

Self-hosted network speed-test system: a single Go binary that embeds a React SPA via `go:embed`. Go backend (traffic engine + SQLite persistence), React 19 frontend, plus a bash CLI client served at `/cli`.

## Layout

- `cmd/speedgo/main.go` — entry point; wires storage, GeoIP locator, handlers, graceful shutdown.
- `internal/config/` — config from `SPEEDGO_*` env vars and CLI flags (see `.env.example`).
- `internal/engine/` — traffic engines: download (zero-alloc 8MB ring buffer), upload (`sync.Pool` + `io.Discard`), ping (200ms WebSocket probes).
- `internal/handlers/` — all HTTP routes in `RegisterRoutes` (`/api/ip`, `/api/download`, `/api/upload`, `/ws/ping`, `/api/results`, `/api/history/*`, `/cli`, embedded SPA) + middleware (CORS, device-UUID cookie `speed_client_uuid`).
- `internal/storage/` — pure-Go SQLite (`modernc.org/sqlite`), WAL mode; DB default `./data/speedgo.db`.
- `internal/ip/` — offline MaxMind MMDB GeoIP/ASN resolver (no external APIs).
- `internal/cli/` — bash script template embedded as a Go string, served at `GET /cli`.
- `web/` — React 19 + Vite + Tailwind CSS 4 frontend; `web/embed.go` embeds `web/dist`.

## Commands

Go (run from repo root):

```bash
go build -o speedgo ./cmd/speedgo   # build binary (requires web/dist to exist)
go test ./...                       # tests exist per package
go vet ./...
```

Frontend (run from `web/`):

```bash
npm install
npm run dev      # Vite dev server on :5173, proxies /api /ws /cli to Go server on :8080
npm run build    # tsc -b && vite build → web/dist
npm run lint     # oxlint
```

Typical dev loop: run Go server on :8080, then `npm run dev` and edit `web/src/`. Production Docker build (`Dockerfile`) builds frontend then the Go binary with `CGO_ENABLED=0`.

## Gotchas & rules

- **`web/dist` is git-tracked and embedded into the binary** (`//go:embed all:dist`). After changing frontend code, run `npm run build` before `go build`, or the binary serves stale assets. Don't hand-edit `dist/`.
- **No CGO**: SQLite is pure Go (`modernc.org/sqlite`) so the binary cross-compiles with `CGO_ENABLED=0`. Never add CGO-dependent dependencies.
- **GeoIP `.mmdb` files are gitignored**. Locally the server looks for `./data/GeoLite2-City.mmdb` + `GeoLite2-ASN.mmdb` (fallbacks: `/data`, `/app/geoip`, `./geoip`). It starts without them, but geo/ISP fields stay empty.
- **IP masking is mandatory** for public/history records (e.g. `114.***.***.12`) — preserve this when touching result/history code.
- **i18n**: all user-facing UI strings live in `web/src/locales/*.ts` (13 languages). New strings must be added to every locale file, not just `en-US`.
- Config changes: update both `internal/config/config.go` and `.env.example` (`.env` itself is gitignored).
- UI conventions: dark frosted-glass aesthetic, large radii (`rounded-2xl`/`rounded-3xl`), mobile-first, `lucide-react` icons, CSS/Tailwind only (no component library).
- Docker runtime image is intentionally minimal (no curl/bash) — container self-testing uses the binary's own `-healthcheck` flag; don't re-add shell tools.
- README and many code comments are in Chinese; commit messages follow Conventional Commits (`feat(scope):`, `fix:`, `revert:`).
