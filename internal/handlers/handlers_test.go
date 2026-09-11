package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/TeemoSun/Speed-Go/internal/config"
	"github.com/TeemoSun/Speed-Go/internal/ip"
	"github.com/TeemoSun/Speed-Go/internal/storage"
)

func setupTestHandler(t *testing.T, trustProxy bool) (*Handler, func()) {
	tmpDB, err := os.CreateTemp("", "speedgo_test_*.db")
	if err != nil {
		t.Fatalf("failed to create temp db: %v", err)
	}
	dbPath := tmpDB.Name()
	tmpDB.Close()

	store, err := storage.NewStorage(dbPath)
	if err != nil {
		os.Remove(dbPath)
		t.Fatalf("failed to open storage: %v", err)
	}

	loc := ip.NewLocator("", "")
	cfg := &config.Config{
		Port:         8080,
		DBPath:       dbPath,
		MaxTestTime:  5,
		MaxChunkSize: 64,
		CORS:         true,
		TrustProxy:   trustProxy,
	}

	h := NewHandler(cfg, loc, store, nil)

	cleanup := func() {
		store.Close()
		os.Remove(dbPath)
		os.Remove(dbPath + "-wal")
		os.Remove(dbPath + "-shm")
	}

	return h, cleanup
}

func TestSecurityHeaders(t *testing.T) {
	h, cleanup := setupTestHandler(t, false)
	defer cleanup()

	mux := http.NewServeMux()
	h.RegisterRoutes(mux)
	wrapped := h.Middleware(mux)

	req := httptest.NewRequest("GET", "/api/ip", nil)
	w := httptest.NewRecorder()

	wrapped.ServeHTTP(w, req)

	if val := w.Header().Get("X-Content-Type-Options"); val != "nosniff" {
		t.Errorf("Expected X-Content-Type-Options nosniff, got %s", val)
	}
	if val := w.Header().Get("X-Frame-Options"); val != "SAMEORIGIN" {
		t.Errorf("Expected X-Frame-Options SAMEORIGIN, got %s", val)
	}
	if val := w.Header().Get("Referrer-Policy"); val != "strict-origin-when-cross-origin" {
		t.Errorf("Expected Referrer-Policy strict-origin-when-cross-origin, got %s", val)
	}
}

func TestRateLimitSaveResult(t *testing.T) {
	h, cleanup := setupTestHandler(t, false)
	defer cleanup()

	payload := SaveResultRequest{
		DownloadMbps: 100.5,
		UploadMbps:   50.2,
		PingMs:       15.0,
		TestType:     "web",
	}
	body, _ := json.Marshal(payload)

	// Make 15 successful calls (the limit)
	for i := 0; i < 15; i++ {
		req := httptest.NewRequest("POST", "/api/results", bytes.NewReader(body))
		req.RemoteAddr = "192.0.2.1:12345"
		w := httptest.NewRecorder()
		h.HandleSaveResult(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Request %d failed with code %d: %s", i+1, w.Code, w.Body.String())
		}
	}

	// 16th call should be rate limited with 429
	req := httptest.NewRequest("POST", "/api/results", bytes.NewReader(body))
	req.RemoteAddr = "192.0.2.1:12345"
	w := httptest.NewRecorder()
	h.HandleSaveResult(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("Expected status 429 Too Many Requests, got %d: %s", w.Code, w.Body.String())
	}
}

func TestOversizedPayloadSaveResult(t *testing.T) {
	h, cleanup := setupTestHandler(t, false)
	defer cleanup()

	// Create payload larger than 64KB
	hugeUA := strings.Repeat("A", 70*1024)
	payload := map[string]any{
		"user_agent": hugeUA,
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest("POST", "/api/results", bytes.NewReader(body))
	req.RemoteAddr = "192.0.2.2:12345"
	w := httptest.NewRecorder()

	h.HandleSaveResult(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400 Bad Request for oversized body, got %d", w.Code)
	}
}

func TestDataSanitization(t *testing.T) {
	h, cleanup := setupTestHandler(t, false)
	defer cleanup()

	// Test negative numbers, extreme numbers and long strings
	rawJSON := []byte(`{
		"download_mbps": -50.0,
		"upload_mbps": 9999999999.0,
		"ping_ms": -10.0,
		"avg_ping_ms": -5.0,
		"worst_ping_ms": 999999999.0,
		"user_agent": "` + strings.Repeat("B", 500) + `",
		"test_type": "MALICIOUS_INJECTION"
	}`)

	req := httptest.NewRequest("POST", "/api/results", bytes.NewReader(rawJSON))
	req.RemoteAddr = "192.0.2.3:12345"
	w := httptest.NewRecorder()

	h.HandleSaveResult(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected OK with sanitized data, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTrustProxyHandleIP(t *testing.T) {
	// Test without trust proxy: spoofed header ignored
	h1, cleanup1 := setupTestHandler(t, false)
	defer cleanup1()

	req1 := httptest.NewRequest("GET", "/api/ip", nil)
	req1.RemoteAddr = "203.0.113.50:1234"
	req1.Header.Set("X-Forwarded-For", "1.2.3.4")
	w1 := httptest.NewRecorder()
	h1.HandleIP(w1, req1)

	var info1 ip.IPInfo
	_ = json.NewDecoder(w1.Body).Decode(&info1)
	if info1.IP != "203.0.113.50" {
		t.Errorf("Expected IP 203.0.113.50 when trustProxy=false, got %s", info1.IP)
	}

	// Test with trust proxy enabled: spoofed header accepted from proxy
	h2, cleanup2 := setupTestHandler(t, true)
	defer cleanup2()

	req2 := httptest.NewRequest("GET", "/api/ip", nil)
	req2.RemoteAddr = "203.0.113.50:1234"
	req2.Header.Set("X-Forwarded-For", "1.2.3.4")
	w2 := httptest.NewRecorder()
	h2.HandleIP(w2, req2)

	var info2 ip.IPInfo
	_ = json.NewDecoder(w2.Body).Decode(&info2)
	if info2.IP != "1.2.3.4" {
		t.Errorf("Expected IP 1.2.3.4 when trustProxy=true, got %s", info2.IP)
	}
}
