package storage

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestStorageLifecycle(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "speedgo_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test_speedgo.db")
	store, err := NewStorage(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize storage: %v", err)
	}
	defer store.Close()

	// 1. Insert record
	rec := &Record{
		ClientUUID:   "test-client-123",
		RawIP:        "114.88.234.12",
		MaskedIP:     "114.***.***.12",
		CountryCode:  "CN",
		CountryName:  "China",
		CityName:     "Shanghai",
		ISP:          "China Telecom",
		DownloadMbps: 850.5,
		UploadMbps:   120.2,
		PingMs:       12.5,
		AvgPingMs:    14.2,
		WorstPingMs:  28.9,
		JitterMs:     1.5,
		PacketLoss:   0.0,
		Disconnects:  0,
		TestType:     "web",
		CreatedAt:    time.Now(),
	}

	id, err := store.InsertRecord(rec)
	if err != nil {
		t.Fatalf("Failed to insert record: %v", err)
	}
	if id == "" {
		t.Fatalf("Expected non-empty generated ID")
	}

	// 2. Query personal history
	records, total, err := store.GetRecordsByClientUUID("test-client-123", 10, 0)
	if err != nil {
		t.Fatalf("Failed to query personal records: %v", err)
	}
	if total != 1 || len(records) != 1 {
		t.Fatalf("Expected 1 record, got total=%d, count=%d", total, len(records))
	}
	if records[0].DownloadMbps != 850.5 {
		t.Errorf("Expected 850.5 Mbps, got %f", records[0].DownloadMbps)
	}
	if records[0].MaskedIP != "114.***.***.12" {
		t.Errorf("Expected masked IP, got %s", records[0].MaskedIP)
	}

	// 3. Query public history (verify RawIP is empty)
	publicRecords, pubTotal, err := store.GetPublicRecords(10, 0)
	if err != nil {
		t.Fatalf("Failed to query public records: %v", err)
	}
	if pubTotal != 1 || len(publicRecords) != 1 {
		t.Fatalf("Expected 1 public record, got total=%d, count=%d", pubTotal, len(publicRecords))
	}
	if publicRecords[0].RawIP != "" {
		t.Errorf("RawIP should be empty in public records, got %q", publicRecords[0].RawIP)
	}

	// 4. Query single record by ID
	singleRec, err := store.GetRecordByID(id)
	if err != nil {
		t.Fatalf("Failed to query record by ID: %v", err)
	}
	if singleRec == nil {
		t.Fatalf("Expected record with ID %s, got nil", id)
	}
	if singleRec.ID != id {
		t.Errorf("Expected ID %s, got %s", id, singleRec.ID)
	}
	if singleRec.DownloadMbps != 850.5 {
		t.Errorf("Expected 850.5 Mbps, got %f", singleRec.DownloadMbps)
	}
	if singleRec.RawIP != "" {
		t.Errorf("RawIP should be empty in single record query, got %q", singleRec.RawIP)
	}

	// 5. Query non-existent ID
	missingRec, err := store.GetRecordByID("rec_not_exist_123")
	if err != nil {
		t.Fatalf("Expected nil error for non-existent ID, got %v", err)
	}
	if missingRec != nil {
		t.Errorf("Expected nil record for non-existent ID, got %+v", missingRec)
	}
}
