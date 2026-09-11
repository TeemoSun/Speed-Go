package config

import (
	"flag"
	"os"
	"strconv"
	"strings"
)

// Config holds all server configuration parameters
type Config struct {
	Port         int
	DBPath       string
	GeoCityPath  string
	GeoASNPath   string
	MaxTestTime  int // seconds
	MaxChunkSize int // MB
	CORS         bool
	StaticDir    string
	Healthcheck  bool
	TrustProxy   bool
	PublicURL    string
}

// loadDotEnv loads key=value pairs from a .env file into the process environment.
// It skips empty lines and comments, and does not overwrite existing OS environment variables.
func loadDotEnv(filepath string) {
	data, err := os.ReadFile(filepath)
	if err != nil {
		return
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		// Strip inline comments if unquoted
		if !strings.HasPrefix(val, "\"") && !strings.HasPrefix(val, "'") {
			if idx := strings.Index(val, "#"); idx != -1 {
				val = strings.TrimSpace(val[:idx])
			}
		}

		// Strip enclosing quotes if present
		if len(val) >= 2 {
			if (val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'') {
				val = val[1 : len(val)-1]
			}
		}

		if key != "" && os.Getenv(key) == "" {
			_ = os.Setenv(key, val)
		}
	}
}

// LoadConfig parses command line flags and environment variables
func LoadConfig() *Config {
	// 1. Automatically load .env file if present
	envFile := os.Getenv("SPEEDGO_ENV_FILE")
	if envFile == "" {
		envFile = ".env"
	}
	loadDotEnv(envFile)

	cfg := &Config{
		Port:         8080,
		DBPath:       "./data/speedgo.db",
		GeoCityPath:  "./data/GeoLite2-City.mmdb",
		GeoASNPath:   "./data/GeoLite2-ASN.mmdb",
		MaxTestTime:  30,
		MaxChunkSize: 512,
		CORS:         true,
		StaticDir:    "./web/dist",
		TrustProxy:   false,
		PublicURL:    "",
	}

	// Environment variable overrides
	if val := os.Getenv("SPEEDGO_PORT"); val != "" {
		if p, err := strconv.Atoi(val); err == nil {
			cfg.Port = p
		}
	}
	if val := os.Getenv("SPEEDGO_DB"); val != "" {
		cfg.DBPath = val
	}
	if val := os.Getenv("SPEEDGO_GEO_CITY"); val != "" {
		cfg.GeoCityPath = val
	}
	if val := os.Getenv("SPEEDGO_GEO_ASN"); val != "" {
		cfg.GeoASNPath = val
	}
	if val := os.Getenv("SPEEDGO_STATIC_DIR"); val != "" {
		cfg.StaticDir = val
	}
	if val := os.Getenv("SPEEDGO_TRUST_PROXY"); val != "" {
		cfg.TrustProxy = val == "true" || val == "1"
	}
	if val := os.Getenv("SPEEDGO_PUBLIC_URL"); val != "" {
		cfg.PublicURL = strings.TrimRight(val, "/")
	}
	if val := os.Getenv("SPEEDGO_MAX_TIME"); val != "" {
		if t, err := strconv.Atoi(val); err == nil {
			cfg.MaxTestTime = t
		}
	}
	if val := os.Getenv("SPEEDGO_MAX_CHUNK"); val != "" {
		if c, err := strconv.Atoi(val); err == nil {
			cfg.MaxChunkSize = c
		}
	}
	if val := os.Getenv("SPEEDGO_CORS"); val != "" {
		cfg.CORS = val == "true" || val == "1"
	}

	// Command line flag overrides
	flag.IntVar(&cfg.Port, "port", cfg.Port, "Port to listen on")
	flag.StringVar(&cfg.DBPath, "db", cfg.DBPath, "Path to SQLite database file")
	flag.StringVar(&cfg.GeoCityPath, "geo-city", cfg.GeoCityPath, "Path to GeoLite2-City mmdb file")
	flag.StringVar(&cfg.GeoASNPath, "geo-asn", cfg.GeoASNPath, "Path to GeoLite2-ASN mmdb file")
	flag.IntVar(&cfg.MaxTestTime, "max-time", cfg.MaxTestTime, "Maximum test duration in seconds")
	flag.IntVar(&cfg.MaxChunkSize, "max-chunk", cfg.MaxChunkSize, "Maximum download chunk size in MB")
	flag.BoolVar(&cfg.CORS, "cors", cfg.CORS, "Enable CORS headers")
	flag.StringVar(&cfg.StaticDir, "static", cfg.StaticDir, "Directory to serve static frontend from (if not using embedded)")
	flag.BoolVar(&cfg.Healthcheck, "healthcheck", false, "Run local container health check and exit")
	flag.BoolVar(&cfg.TrustProxy, "trust-proxy", cfg.TrustProxy, "Trust reverse proxy IP headers (CF-Connecting-IP, X-Real-IP, X-Forwarded-For)")
	flag.StringVar(&cfg.PublicURL, "public-url", cfg.PublicURL, "Public base URL for client access (e.g., https://speed.example.com)")

	// Avoid duplicate parsing when called multiple times in tests
	if !flag.Parsed() {
		flag.Parse()
	}

	// Auto-detect GeoIP database files if default path does not exist on disk
	if _, err := os.Stat(cfg.GeoCityPath); err != nil {
		cfg.GeoCityPath = findFirstExisting(
			cfg.GeoCityPath,
			"/data/GeoLite2-City.mmdb",
			"/app/geoip/GeoLite2-City.mmdb",
			"./geoip/GeoLite2-City.mmdb",
		)
	}
	if _, err := os.Stat(cfg.GeoASNPath); err != nil {
		cfg.GeoASNPath = findFirstExisting(
			cfg.GeoASNPath,
			"/data/GeoLite2-ASN.mmdb",
			"/app/geoip/GeoLite2-ASN.mmdb",
			"./geoip/GeoLite2-ASN.mmdb",
		)
	}

	return cfg
}

// findFirstExisting returns the first path that actually exists on disk
func findFirstExisting(paths ...string) string {
	for _, p := range paths {
		if p == "" {
			continue
		}
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	if len(paths) > 0 {
		return paths[0]
	}
	return ""
}
