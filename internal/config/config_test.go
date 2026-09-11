package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDotEnv(t *testing.T) {
	tmpDir := t.TempDir()
	envPath := filepath.Join(tmpDir, ".env")

	content := `
# SpeedGo Configuration
SPEEDGO_PORT=9090
SPEEDGO_TRUST_PROXY=true # trust proxies
SPEEDGO_PUBLIC_URL="https://speedtest.example.com"
SPEEDGO_DB="./custom/speedgo.db"
SPEEDGO_CORS=false
`
	if err := os.WriteFile(envPath, []byte(content), 0644); err != nil {
		t.Fatalf("failed to write test .env: %v", err)
	}

	// Set SPEEDGO_ENV_FILE
	origEnv := os.Getenv("SPEEDGO_ENV_FILE")
	defer os.Setenv("SPEEDGO_ENV_FILE", origEnv)
	os.Setenv("SPEEDGO_ENV_FILE", envPath)

	// Clear variables to ensure .env is read
	os.Unsetenv("SPEEDGO_PORT")
	os.Unsetenv("SPEEDGO_TRUST_PROXY")
	os.Unsetenv("SPEEDGO_PUBLIC_URL")
	os.Unsetenv("SPEEDGO_DB")
	os.Unsetenv("SPEEDGO_CORS")

	loadDotEnv(envPath)

	if os.Getenv("SPEEDGO_PORT") != "9090" {
		t.Errorf("Expected SPEEDGO_PORT=9090, got %s", os.Getenv("SPEEDGO_PORT"))
	}
	if os.Getenv("SPEEDGO_TRUST_PROXY") != "true" {
		t.Errorf("Expected SPEEDGO_TRUST_PROXY=true, got %s", os.Getenv("SPEEDGO_TRUST_PROXY"))
	}
	if os.Getenv("SPEEDGO_PUBLIC_URL") != "https://speedtest.example.com" {
		t.Errorf("Expected SPEEDGO_PUBLIC_URL=https://speedtest.example.com, got %s", os.Getenv("SPEEDGO_PUBLIC_URL"))
	}
	if os.Getenv("SPEEDGO_DB") != "./custom/speedgo.db" {
		t.Errorf("Expected SPEEDGO_DB=./custom/speedgo.db, got %s", os.Getenv("SPEEDGO_DB"))
	}
	if os.Getenv("SPEEDGO_CORS") != "false" {
		t.Errorf("Expected SPEEDGO_CORS=false, got %s", os.Getenv("SPEEDGO_CORS"))
	}
}
