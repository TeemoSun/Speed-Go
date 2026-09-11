package config

import (
	"flag"
	"os"
	"strconv"
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
}

// LoadConfig parses command line flags and environment variables
func LoadConfig() *Config {
	cfg := &Config{
		Port:         8080,
		DBPath:       "./data/speedgo.db",
		GeoCityPath:  "./data/GeoLite2-City.mmdb",
		GeoASNPath:   "./data/GeoLite2-ASN.mmdb",
		MaxTestTime:  30,
		MaxChunkSize: 512,
		CORS:         true,
		StaticDir:    "./web/dist",
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

	// Avoid duplicate parsing when called multiple times in tests
	if !flag.Parsed() {
		flag.Parse()
	}

	return cfg
}
