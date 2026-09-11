package storage

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

// Record represents a speedtest result entry
type Record struct {
	ID           string    `json:"id"`
	ClientUUID   string    `json:"client_uuid"`
	RawIP        string    `json:"raw_ip,omitempty"`
	MaskedIP     string    `json:"masked_ip"`
	CountryCode  string    `json:"country_code"`
	CountryName  string    `json:"country_name"`
	RegionName   string    `json:"region_name"`
	CityName     string    `json:"city_name"`
	ISP          string    `json:"isp"`
	DownloadMbps float64   `json:"download_mbps"`
	UploadMbps   float64   `json:"upload_mbps"`
	PingMs       float64   `json:"ping_ms"`
	AvgPingMs    float64   `json:"avg_ping_ms"`
	WorstPingMs  float64   `json:"worst_ping_ms"`
	JitterMs     float64   `json:"jitter_ms"`
	PacketLoss   float64   `json:"packet_loss"`
	Disconnects  int       `json:"disconnects"`
	TestType     string    `json:"test_type"`
	UserAgent    string    `json:"user_agent"`
	CreatedAt    time.Time `json:"created_at"`
}

// Storage manages SQLite database interactions
type Storage struct {
	db *sql.DB
}

// NewStorage opens SQLite with WAL mode and runs table migration
func NewStorage(dbPath string) (*Storage, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite db: %w", err)
	}

	// Performance Pragmas
	pragmas := []string{
		"PRAGMA journal_mode = WAL;",
		"PRAGMA busy_timeout = 5000;",
		"PRAGMA synchronous = NORMAL;",
		"PRAGMA cache_size = -32000;",
	}
	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			return nil, fmt.Errorf("failed to execute pragma %s: %w", p, err)
		}
	}

	s := &Storage{db: db}
	if err := s.migrate(); err != nil {
		return nil, fmt.Errorf("database migration failed: %w", err)
	}

	return s, nil
}

// migrate creates required tables and indexes
func (s *Storage) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS speedtest_records (
		id              TEXT PRIMARY KEY,
		client_uuid     TEXT NOT NULL,
		raw_ip          TEXT NOT NULL,
		masked_ip       TEXT NOT NULL,
		country_code    TEXT,
		country_name    TEXT,
		region_name     TEXT,
		city_name       TEXT,
		isp             TEXT,
		download_mbps   REAL NOT NULL DEFAULT 0.0,
		upload_mbps     REAL NOT NULL DEFAULT 0.0,
		ping_ms         REAL NOT NULL DEFAULT 0.0,
		avg_ping_ms     REAL NOT NULL DEFAULT 0.0,
		worst_ping_ms   REAL NOT NULL DEFAULT 0.0,
		jitter_ms       REAL NOT NULL DEFAULT 0.0,
		packet_loss     REAL NOT NULL DEFAULT 0.0,
		disconnects     INTEGER NOT NULL DEFAULT 0,
		test_type       TEXT NOT NULL DEFAULT 'web',
		user_agent      TEXT,
		created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_records_client_uuid ON speedtest_records(client_uuid, created_at DESC);
	CREATE INDEX IF NOT EXISTS idx_records_created_at ON speedtest_records(created_at DESC);
	`
	_, err := s.db.Exec(schema)
	return err
}

// Close closes the database connection
func (s *Storage) Close() error {
	return s.db.Close()
}

// generateID creates a short unique ID with prefix rec_
func generateID() string {
	b := make([]byte, 5)
	_, _ = rand.Read(b)
	return "rec_" + hex.EncodeToString(b)
}

// InsertRecord persists a new test record
func (s *Storage) InsertRecord(r *Record) (string, error) {
	if r.ID == "" {
		r.ID = generateID()
	}
	if r.CreatedAt.IsZero() {
		r.CreatedAt = time.Now()
	}

	query := `
	INSERT INTO speedtest_records (
		id, client_uuid, raw_ip, masked_ip, country_code, country_name,
		region_name, city_name, isp, download_mbps, upload_mbps,
		ping_ms, avg_ping_ms, worst_ping_ms, jitter_ms, packet_loss,
		disconnects, test_type, user_agent, created_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := s.db.Exec(query,
		r.ID, r.ClientUUID, r.RawIP, r.MaskedIP, r.CountryCode, r.CountryName,
		r.RegionName, r.CityName, r.ISP, r.DownloadMbps, r.UploadMbps,
		r.PingMs, r.AvgPingMs, r.WorstPingMs, r.JitterMs, r.PacketLoss,
		r.Disconnects, r.TestType, r.UserAgent, r.CreatedAt,
	)
	if err != nil {
		return "", err
	}
	return r.ID, nil
}

// GetRecordsByClientUUID returns records matching client_uuid
func (s *Storage) GetRecordsByClientUUID(clientUUID string, limit, offset int) ([]Record, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var total int
	err := s.db.QueryRow("SELECT COUNT(*) FROM speedtest_records WHERE client_uuid = ?", clientUUID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
	SELECT 
		id, client_uuid, masked_ip, country_code, country_name,
		region_name, city_name, isp, download_mbps, upload_mbps,
		ping_ms, avg_ping_ms, worst_ping_ms, jitter_ms, packet_loss,
		disconnects, test_type, user_agent, created_at
	FROM speedtest_records
	WHERE client_uuid = ?
	ORDER BY created_at DESC
	LIMIT ? OFFSET ?
	`

	rows, err := s.db.Query(query, clientUUID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var records []Record
	for rows.Next() {
		var r Record
		err := rows.Scan(
			&r.ID, &r.ClientUUID, &r.MaskedIP, &r.CountryCode, &r.CountryName,
			&r.RegionName, &r.CityName, &r.ISP, &r.DownloadMbps, &r.UploadMbps,
			&r.PingMs, &r.AvgPingMs, &r.WorstPingMs, &r.JitterMs, &r.PacketLoss,
			&r.Disconnects, &r.TestType, &r.UserAgent, &r.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		records = append(records, r)
	}

	return records, total, nil
}

// GetPublicRecords returns recent records with masked IPs
func (s *Storage) GetPublicRecords(limit, offset int) ([]Record, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var total int
	err := s.db.QueryRow("SELECT COUNT(*) FROM speedtest_records").Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
	SELECT 
		id, masked_ip, country_code, country_name,
		region_name, city_name, isp, download_mbps, upload_mbps,
		ping_ms, avg_ping_ms, worst_ping_ms, jitter_ms, packet_loss,
		disconnects, test_type, created_at
	FROM speedtest_records
	ORDER BY created_at DESC
	LIMIT ? OFFSET ?
	`

	rows, err := s.db.Query(query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var records []Record
	for rows.Next() {
		var r Record
		err := rows.Scan(
			&r.ID, &r.MaskedIP, &r.CountryCode, &r.CountryName,
			&r.RegionName, &r.CityName, &r.ISP, &r.DownloadMbps, &r.UploadMbps,
			&r.PingMs, &r.AvgPingMs, &r.WorstPingMs, &r.JitterMs, &r.PacketLoss,
			&r.Disconnects, &r.TestType, &r.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		records = append(records, r)
	}

	return records, total, nil
}

// PruneRecords deletes old history according to the retention policy.
// maxDays removes records older than that many days; maxRecords keeps only
// the newest N records. A non-positive value disables the corresponding
// condition. Returns the number of removed records.
func (s *Storage) PruneRecords(maxDays, maxRecords int) (int64, error) {
	var removed int64

	if maxDays > 0 {
		cutoff := time.Now().AddDate(0, 0, -maxDays)
		res, err := s.db.Exec("DELETE FROM speedtest_records WHERE created_at < ?", cutoff)
		if err != nil {
			return removed, fmt.Errorf("delete records older than %d days: %w", maxDays, err)
		}
		n, _ := res.RowsAffected()
		removed += n
	}

	if maxRecords > 0 {
		res, err := s.db.Exec(
			"DELETE FROM speedtest_records WHERE id NOT IN (SELECT id FROM speedtest_records ORDER BY created_at DESC LIMIT ?)",
			maxRecords,
		)
		if err != nil {
			return removed, fmt.Errorf("delete records beyond newest %d: %w", maxRecords, err)
		}
		n, _ := res.RowsAffected()
		removed += n
	}

	return removed, nil
}

// GetRecordByID returns a single shareable record by its ID. Raw IP,
// client UUID and user agent are deliberately not selected: the record is
// world-readable by ID and must not leak identifiers that unlock history.
func (s *Storage) GetRecordByID(id string) (*Record, error) {
	query := `
	SELECT
		id, masked_ip, country_code, country_name,
		region_name, city_name, isp, download_mbps, upload_mbps,
		ping_ms, avg_ping_ms, worst_ping_ms, jitter_ms, packet_loss,
		disconnects, test_type, created_at
	FROM speedtest_records
	WHERE id = ?
	LIMIT 1
	`

	var r Record
	err := s.db.QueryRow(query, id).Scan(
		&r.ID, &r.MaskedIP, &r.CountryCode, &r.CountryName,
		&r.RegionName, &r.CityName, &r.ISP, &r.DownloadMbps, &r.UploadMbps,
		&r.PingMs, &r.AvgPingMs, &r.WorstPingMs, &r.JitterMs, &r.PacketLoss,
		&r.Disconnects, &r.TestType, &r.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &r, nil
}
