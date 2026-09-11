package cli

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestIsValidHost(t *testing.T) {
	valid := []string{
		"localhost",
		"localhost:8080",
		"127.0.0.1",
		"127.0.0.1:8080",
		"speed.example.com",
		"speed.example.com:443",
		"[::1]:8080",
		"[2001:db8::1]",
	}

	for _, h := range valid {
		if !IsValidHost(h) {
			t.Errorf("Expected host %q to be valid", h)
		}
	}

	invalid := []string{
		"",
		"evil.com\"; rm -rf /; #",
		"example.com/path",
		"example.com:8080/foo",
		"example.com\nevil.com",
		"example.com`whoami`",
		"example.com$(id)",
		"example.com' OR '1'='1",
		"example.com\\test",
		strings.Repeat("a", 300),
	}

	for _, h := range invalid {
		if IsValidHost(h) {
			t.Errorf("Expected host %q to be invalid", h)
		}
	}
}

func TestServeCLIHostInjection(t *testing.T) {
	// Test malicious Host header is neutralized
	req := httptest.NewRequest("GET", "/cli", nil)
	req.Host = "evil.com\"; rm -rf /; #"
	w := httptest.NewRecorder()

	ServeCLI(w, req, "")

	resp := w.Body.String()
	if strings.Contains(resp, "rm -rf") {
		t.Fatalf("Malicious command was not filtered out from bash script!")
	}
	if !strings.Contains(resp, `SERVER_URL="http://localhost:8080"`) {
		t.Errorf("Expected fallback to localhost:8080, got script: %s", resp[:300])
	}

	// Verify security headers
	if cc := w.Header().Get("Cache-Control"); !strings.Contains(cc, "no-store") {
		t.Errorf("Expected Cache-Control no-store, got %s", cc)
	}
	if ct := w.Header().Get("X-Content-Type-Options"); ct != "nosniff" {
		t.Errorf("Expected X-Content-Type-Options nosniff, got %s", ct)
	}
}

func TestServeCLIPublicURL(t *testing.T) {
	req := httptest.NewRequest("GET", "/cli", nil)
	req.Host = "spoofed.com"
	w := httptest.NewRecorder()

	ServeCLI(w, req, "https://speed.mycompany.org")

	resp := w.Body.String()
	if !strings.Contains(resp, `SERVER_URL="https://speed.mycompany.org"`) {
		t.Errorf("Expected PublicURL to take precedence, got script: %s", resp[:300])
	}
}
