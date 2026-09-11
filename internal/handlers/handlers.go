package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/TeemoSun/Speed-Go/internal/cli"
	"github.com/TeemoSun/Speed-Go/internal/config"
	"github.com/TeemoSun/Speed-Go/internal/engine"
	"github.com/TeemoSun/Speed-Go/internal/ip"
	"github.com/TeemoSun/Speed-Go/internal/storage"
)

// Handler holds dependencies for all HTTP endpoints
type Handler struct {
	cfg        *config.Config
	loc        *ip.Locator
	store      *storage.Storage
	embeddedFS http.FileSystem
}

// NewHandler creates a new Handler instance
func NewHandler(cfg *config.Config, loc *ip.Locator, store *storage.Storage, embeddedFS http.FileSystem) *Handler {
	return &Handler{
		cfg:        cfg,
		loc:        loc,
		store:      store,
		embeddedFS: embeddedFS,
	}
}

// ClientUUIDCookieName is the cookie name for client tracking
const ClientUUIDCookieName = "speed_client_uuid"

// Middleware wraps http.Handler with CORS and Client UUID cookie handling
func (h *Handler) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. CORS headers
		if h.cfg.CORS {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Encoding, Range")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}

		// 2. Client UUID cookie injection if absent
		cookie, err := r.Cookie(ClientUUIDCookieName)
		if err != nil || cookie.Value == "" {
			newUUID := uuid.NewString()
			http.SetCookie(w, &http.Cookie{
				Name:     ClientUUIDCookieName,
				Value:    newUUID,
				Path:     "/",
				MaxAge:   365 * 24 * 60 * 60, // 1 year
				HttpOnly: false,              // Accessible to JS for display if desired
				SameSite: http.SameSiteLaxMode,
			})
		}

		next.ServeHTTP(w, r)
	})
}

// getClientUUID gets or assigns the client UUID
func (h *Handler) getClientUUID(r *http.Request) string {
	if c, err := r.Cookie(ClientUUIDCookieName); err == nil && c.Value != "" {
		return c.Value
	}
	return ""
}

// HandleIP resolves client IP and network geo details
func (h *Handler) HandleIP(w http.ResponseWriter, r *http.Request) {
	clientIP := ip.ExtractClientIP(r)
	info := h.loc.Lookup(clientIP)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
	_ = json.NewEncoder(w).Encode(info)
}

// HandleDownload proxies to download engine
func (h *Handler) HandleDownload(w http.ResponseWriter, r *http.Request) {
	engine.ServeDownload(w, r, h.cfg.MaxChunkSize)
}

// HandleUpload proxies to upload engine
func (h *Handler) HandleUpload(w http.ResponseWriter, r *http.Request) {
	engine.ServeUpload(w, r)
}

// HandlePingWS handles continuous WebSocket probe
func (h *Handler) HandlePingWS(w http.ResponseWriter, r *http.Request) {
	engine.ServePing(w, r)
}

// HandleCLI outputs the interactive bash script
func (h *Handler) HandleCLI(w http.ResponseWriter, r *http.Request) {
	cli.ServeCLI(w, r)
}

// SaveResultRequest JSON payload
type SaveResultRequest struct {
	ClientUUID   string  `json:"client_uuid"`
	DownloadMbps float64 `json:"download_mbps"`
	UploadMbps   float64 `json:"upload_mbps"`
	PingMs       float64 `json:"ping_ms"`
	AvgPingMs    float64 `json:"avg_ping_ms"`
	WorstPingMs  float64 `json:"worst_ping_ms"`
	JitterMs     float64 `json:"jitter_ms"`
	PacketLoss   float64 `json:"packet_loss"`
	Disconnects  int     `json:"disconnects"`
	TestType     string  `json:"test_type"`
	UserAgent    string  `json:"user_agent"`
}

// HandleSaveResult saves a completed test into SQLite
func (h *Handler) HandleSaveResult(w http.ResponseWriter, r *http.Request) {
	var req SaveResultRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	clientIP := ip.ExtractClientIP(r)
	info := h.loc.Lookup(clientIP)

	clientUUID := req.ClientUUID
	if clientUUID == "" {
		clientUUID = h.getClientUUID(r)
	}
	if clientUUID == "" {
		clientUUID = "anon_" + clientIP
	}

	ua := req.UserAgent
	if ua == "" {
		ua = r.UserAgent()
	}

	rec := storage.Record{
		ClientUUID:   clientUUID,
		RawIP:        clientIP,
		MaskedIP:     info.MaskedIP,
		CountryCode:  info.CountryCode,
		CountryName:  info.CountryName,
		RegionName:   info.RegionName,
		CityName:     info.CityName,
		ISP:          info.ISP,
		DownloadMbps: req.DownloadMbps,
		UploadMbps:   req.UploadMbps,
		PingMs:       req.PingMs,
		AvgPingMs:    req.AvgPingMs,
		WorstPingMs:  req.WorstPingMs,
		JitterMs:     req.JitterMs,
		PacketLoss:   req.PacketLoss,
		Disconnects:  req.Disconnects,
		TestType:     req.TestType,
		UserAgent:    ua,
		CreatedAt:    time.Now(),
	}

	id, err := h.store.InsertRecord(&rec)
	if err != nil {
		http.Error(w, "Failed to save record: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"test_id": id,
		"status":  "ok",
	})
}

// HandleHistoryMe returns records for the current device
func (h *Handler) HandleHistoryMe(w http.ResponseWriter, r *http.Request) {
	clientUUID := h.getClientUUID(r)
	if clientUUID == "" {
		clientUUID = r.URL.Query().Get("uuid")
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	records, total, err := h.store.GetRecordsByClientUUID(clientUUID, limit, offset)
	if err != nil {
		http.Error(w, "Failed to query history: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"records": records,
		"total":   total,
	})
}

// HandleHistoryPublic returns recent records with masked IPs
func (h *Handler) HandleHistoryPublic(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	records, total, err := h.store.GetPublicRecords(limit, offset)
	if err != nil {
		http.Error(w, "Failed to query public history: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"records": records,
		"total":   total,
	})
}

// RegisterRoutes registers all API routes and static asset serving
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	// API endpoints
	mux.HandleFunc("GET /api/ip", h.HandleIP)
	mux.HandleFunc("GET /api/download", h.HandleDownload)
	mux.HandleFunc("POST /api/upload", h.HandleUpload)
	mux.HandleFunc("GET /ws/ping", h.HandlePingWS)
	mux.HandleFunc("POST /api/results", h.HandleSaveResult)
	mux.HandleFunc("GET /api/history/me", h.HandleHistoryMe)
	mux.HandleFunc("GET /api/history/public", h.HandleHistoryPublic)
	mux.HandleFunc("GET /cli", h.HandleCLI)

	// Static asset serving with SPA fallback
	mux.HandleFunc("GET /", h.serveStatic)
}

// serveStatic serves frontend assets or falls back to index.html
func (h *Handler) serveStatic(w http.ResponseWriter, r *http.Request) {
	// If path starts with /api/ or /ws/, it was an unmatched API route
	if strings.HasPrefix(r.URL.Path, "/api/") || strings.HasPrefix(r.URL.Path, "/ws/") {
		http.NotFound(w, r)
		return
	}

	// 1. Check disk static directory first (useful during local development)
	if h.cfg.StaticDir != "" {
		filePath := filepath.Join(h.cfg.StaticDir, filepath.Clean(r.URL.Path))
		if stat, err := os.Stat(filePath); err == nil && !stat.IsDir() {
			http.ServeFile(w, r, filePath)
			return
		}
		// SPA fallback
		indexPath := filepath.Join(h.cfg.StaticDir, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			http.ServeFile(w, r, indexPath)
			return
		}
	}

	// 2. Check embedded filesystem if present
	if h.embeddedFS != nil {
		cleanPath := filepath.Clean(r.URL.Path)
		if cleanPath == "/" || cleanPath == "." {
			cleanPath = "index.html"
		} else {
			cleanPath = strings.TrimPrefix(cleanPath, "/")
		}

		f, err := h.embeddedFS.Open(cleanPath)
		if err == nil {
			_ = f.Close()
			http.FileServer(h.embeddedFS).ServeHTTP(w, r)
			return
		}

		// Embedded SPA fallback to index.html
		if indexFile, err := h.embeddedFS.Open("index.html"); err == nil {
			_ = indexFile.Close()
			r.URL.Path = "/"
			http.FileServer(h.embeddedFS).ServeHTTP(w, r)
			return
		}
	}

	// Default fallback message if no frontend is built yet
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`<!DOCTYPE html>
<html>
<head><title>SpeedGo Server</title></head>
<body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
  <h1>SpeedGo API Server is Running!</h1>
  <p>Run CLI test: <code>curl -sL <script>document.write(window.location.origin)</script>/cli | bash</code></p>
  <p>Frontend assets are not compiled yet. Build the React app in <code>web/</code> directory.</p>
</body>
</html>`))
}
