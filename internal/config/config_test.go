package config

import (
	"flag"
	"io"
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

// withFreshFlags isolates each LoadConfig call: LoadConfig registers flags on
// the global CommandLine, which would panic with "flag redefined" on a second
// call inside the same test binary.
func withFreshFlags(t *testing.T) {
	t.Helper()
	old := flag.CommandLine
	flag.CommandLine = flag.NewFlagSet(os.Args[0], flag.ContinueOnError)
	flag.CommandLine.SetOutput(io.Discard)
	t.Cleanup(func() { flag.CommandLine = old })
}

func TestHistoryRetentionConfig(t *testing.T) {
	// Restore original env afterwards
	origDays := os.Getenv("SPEEDGO_HISTORY_MAX_DAYS")
	origRecords := os.Getenv("SPEEDGO_HISTORY_MAX_RECORDS")
	defer func() {
		os.Setenv("SPEEDGO_HISTORY_MAX_DAYS", origDays)
		os.Setenv("SPEEDGO_HISTORY_MAX_RECORDS", origRecords)
	}()

	t.Run("defaults: 0 days, 10000 records", func(t *testing.T) {
		withFreshFlags(t)
		os.Unsetenv("SPEEDGO_HISTORY_MAX_DAYS")
		os.Unsetenv("SPEEDGO_HISTORY_MAX_RECORDS")
		cfg := LoadConfig()
		if cfg.HistoryMaxDays != 0 {
			t.Errorf("Expected default HistoryMaxDays=0, got %d", cfg.HistoryMaxDays)
		}
		if cfg.HistoryMaxRecords != 10000 {
			t.Errorf("Expected default HistoryMaxRecords=10000, got %d", cfg.HistoryMaxRecords)
		}
	})

	t.Run("env overrides", func(t *testing.T) {
		withFreshFlags(t)
		os.Setenv("SPEEDGO_HISTORY_MAX_DAYS", "365")
		os.Setenv("SPEEDGO_HISTORY_MAX_RECORDS", "5000")
		cfg := LoadConfig()
		if cfg.HistoryMaxDays != 365 {
			t.Errorf("Expected HistoryMaxDays=365, got %d", cfg.HistoryMaxDays)
		}
		if cfg.HistoryMaxRecords != 5000 {
			t.Errorf("Expected HistoryMaxRecords=5000, got %d", cfg.HistoryMaxRecords)
		}
	})
}
