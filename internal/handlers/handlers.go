package handlers

import (
	"encoding/json"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/TeemoSun/Speed-Go/internal/cli"
	"github.com/TeemoSun/Speed-Go/internal/config"
	"github.com/TeemoSun/Speed-Go/internal/engine"
	"github.com/TeemoSun/Speed-Go/internal/ip"
	"github.com/TeemoSun/Speed-Go/internal/storage"
)

// ipRateLimiter limits requests per IP using a sliding window
type ipRateLimiter struct {
	mu       sync.Mutex
	visitors map[string][]time.Time
	limit    int
	window   time.Duration
	// maxVisitors bounds the tracked-IP map so source-IP rotation (spoofed
	// proxy headers, IPv6 blocks) cannot grow it without limit between
	// cleanup cycles.
	maxVisitors int
}

// maxTrackedVisitors caps memory of the rate limiter at roughly tens of MB
// worst case while staying far above any legitimate per-minute visitor count.
const maxTrackedVisitors = 50_000

func newIPRateLimiter(limit int, window time.Duration) *ipRateLimiter {
	rl := &ipRateLimiter{
		visitors:    make(map[string][]time.Time),
		limit:       limit,
		window:      window,
		maxVisitors: maxTrackedVisitors,
	}
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			rl.cleanup()
		}
	}()
	return rl
}

func (rl *ipRateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	cutoff := time.Now().Add(-rl.window)
	for ipStr, timestamps := range rl.visitors {
		var valid []time.Time
		for _, t := range timestamps {
			if t.After(cutoff) {
				valid = append(valid, t)
			}
		}
		if len(valid) == 0 {
			delete(rl.visitors, ipStr)
		} else {
			rl.visitors[ipStr] = valid
		}
	}
}

func (rl *ipRateLimiter) Allow(ipStr string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	timestamps := rl.visitors[ipStr]
	var valid []time.Time
	for _, t := range timestamps {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= rl.limit {
		rl.visitors[ipStr] = valid
		return false
	}

	// At capacity and this is an unseen IP: allow the request through
	// untracked instead of evicting or rejecting, so flooding fake IPs cannot
	// lock out legitimate new visitors; already-tracked IPs stay limited.
	if _, tracked := rl.visitors[ipStr]; !tracked && len(rl.visitors) >= rl.maxVisitors {
		return true
	}

	rl.visitors[ipStr] = append(valid, now)
	return true
}

func sanitizeFloat(val float64, minVal, maxVal float64) float64 {
	if math.IsNaN(val) || math.IsInf(val, 0) || val < minVal {
		return minVal
	}
	if val > maxVal {
		return maxVal
	}
	return val
}

func sanitizeString(s string, maxLen int) string {
	s = strings.TrimSpace(s)
	var sb strings.Builder
	for _, r := range s {
		if r >= 32 && r != 127 {
			sb.WriteRune(r)
		}
	}
	clean := sb.String()
	if len(clean) > maxLen {
		return clean[:maxLen]
	}
	return clean
}

// Handler holds dependencies for all HTTP endpoints
type Handler struct {
	cfg           *config.Config
	loc           *ip.Locator
	store         *storage.Storage
	embeddedFS    http.FileSystem
	resultLimiter *ipRateLimiter
}

// NewHandler creates a new Handler instance
func NewHandler(cfg *config.Config, loc *ip.Locator, store *storage.Storage, embeddedFS http.FileSystem) *Handler {
	return &Handler{
		cfg:           cfg,
		loc:           loc,
		store:         store,
		embeddedFS:    embeddedFS,
		resultLimiter: newIPRateLimiter(15, time.Minute), // 15 saves per minute per IP
	}
}

// ClientUUIDCookieName is the cookie name for client tracking
const ClientUUIDCookieName = "speed_client_uuid"

// Middleware wraps http.Handler with security headers, CORS, and Client UUID cookie handling
func (h *Handler) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. Modern security headers
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "SAMEORIGIN")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// 2. CORS headers
		if h.cfg.CORS {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Encoding, Range")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}

		// 3. Client UUID cookie injection if absent
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
	clientIP := ip.ExtractClientIP(r, h.cfg.TrustProxy)
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
	engine.ServeUpload(w, r, h.cfg.MaxTestTime)
}

// HandlePingWS handles continuous WebSocket probe
func (h *Handler) HandlePingWS(w http.ResponseWriter, r *http.Request) {
	engine.ServePing(w, r)
}

// HandleCLI outputs the interactive bash script
func (h *Handler) HandleCLI(w http.ResponseWriter, r *http.Request) {
	cli.ServeCLI(w, r, h.cfg.PublicURL)
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

// HandleSaveResult saves a completed test into SQLite with rate limiting and sanitization
func (h *Handler) HandleSaveResult(w http.ResponseWriter, r *http.Request) {
	clientIP := ip.ExtractClientIP(r, h.cfg.TrustProxy)

	// Rate limiting: prevent database exhaustion / DoS
	if !h.resultLimiter.Allow(clientIP) {
		http.Error(w, "Rate limit exceeded. Please wait before submitting more results.", http.StatusTooManyRequests)
		return
	}

	// Limit request body size to 64KB
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)

	var req SaveResultRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid or oversized JSON payload", http.StatusBadRequest)
		return
	}

	info := h.loc.Lookup(clientIP)

	clientUUID := sanitizeString(req.ClientUUID, 64)
	if clientUUID == "" {
		clientUUID = sanitizeString(h.getClientUUID(r), 64)
	}
	if clientUUID == "" {
		clientUUID = "anon_" + clientIP
	}

	ua := req.UserAgent
	if ua == "" {
		ua = r.UserAgent()
	}
	ua = sanitizeString(ua, 256)

	testType := strings.ToLower(strings.TrimSpace(req.TestType))
	if testType != "cli" && testType != "web" {
		testType = "web"
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
		DownloadMbps: sanitizeFloat(req.DownloadMbps, 0, 100000),
		UploadMbps:   sanitizeFloat(req.UploadMbps, 0, 100000),
		PingMs:       sanitizeFloat(req.PingMs, 0, 60000),
		AvgPingMs:    sanitizeFloat(req.AvgPingMs, 0, 60000),
		WorstPingMs:  sanitizeFloat(req.WorstPingMs, 0, 60000),
		JitterMs:     sanitizeFloat(req.JitterMs, 0, 60000),
		PacketLoss:   sanitizeFloat(req.PacketLoss, 0, 100),
		Disconnects:  int(sanitizeFloat(float64(req.Disconnects), 0, 1000)),
		TestType:     testType,
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

// HandleHistoryMe returns records for the current device.
// Only the client UUID cookie is honored; a uuid query parameter would let
// anyone who learns a UUID (e.g. from a shared result) read that device's
// full history.
func (h *Handler) HandleHistoryMe(w http.ResponseWriter, r *http.Request) {
	clientUUID := sanitizeString(h.getClientUUID(r), 64)

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

// HandleGetResult returns a single speedtest result by ID
func (h *Handler) HandleGetResult(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		id = r.URL.Query().Get("id")
	}
	id = sanitizeString(id, 64)
	if id == "" {
		http.Error(w, "Missing test ID", http.StatusBadRequest)
		return
	}

	rec, err := h.store.GetRecordByID(id)
	if err != nil {
		http.Error(w, "Failed to query record: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if rec == nil {
		http.Error(w, "Record not found", http.StatusNotFound)
		return
	}

	// Double check raw IP is never exposed
	rec.RawIP = ""

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"record": rec,
		"status": "ok",
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
	mux.HandleFunc("GET /api/results/{id}", h.HandleGetResult)
	mux.HandleFunc("GET /api/results", h.HandleGetResult)
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
