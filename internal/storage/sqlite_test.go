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
	if singleRec.ClientUUID != "" || singleRec.UserAgent != "" {
		t.Errorf("Single record query must not expose client_uuid/user_agent, got %q/%q", singleRec.ClientUUID, singleRec.UserAgent)
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

// newTestStorage creates a fresh storage in a temp dir for one test case
func newTestStorage(t *testing.T) *Storage {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test_prune.db")
	store, err := NewStorage(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize storage: %v", err)
	}
	t.Cleanup(func() { store.Close() })
	return store
}

func TestPruneRecords(t *testing.T) {
	// insertN inserts n records at the given age, oldest first
	insertN := func(t *testing.T, s *Storage, n int, ageDays int) []string {
		t.Helper()
		ids := make([]string, 0, n)
		base := time.Now().AddDate(0, 0, -ageDays).Truncate(time.Second)
		for i := 0; i < n; i++ {
			rec := &Record{
				ClientUUID:   "prune-test-client",
				RawIP:        "114.88.234.12",
				MaskedIP:     "114.***.***.12",
				DownloadMbps: 100.0,
				TestType:     "web",
				CreatedAt:    base.Add(time.Duration(i) * time.Minute),
			}
			id, err := s.InsertRecord(rec)
			if err != nil {
				t.Fatalf("Failed to insert record: %v", err)
			}
			ids = append(ids, id)
		}
		return ids
	}

	t.Run("disabled when both are zero", func(t *testing.T) {
		s := newTestStorage(t)
		insertN(t, s, 5, 30)
		removed, err := s.PruneRecords(0, 0)
		if err != nil {
			t.Fatalf("PruneRecords failed: %v", err)
		}
		if removed != 0 {
			t.Errorf("Expected 0 removed, got %d", removed)
		}
		if _, total, _ := s.GetPublicRecords(100, 0); total != 5 {
			t.Errorf("Expected 5 records kept, got %d", total)
		}
	})

	t.Run("delete by days only", func(t *testing.T) {
		s := newTestStorage(t)
		oldIDs := insertN(t, s, 3, 10)
		insertN(t, s, 2, 0)
		removed, err := s.PruneRecords(7, 0)
		if err != nil {
			t.Fatalf("PruneRecords failed: %v", err)
		}
		if removed != 3 {
			t.Errorf("Expected 3 removed, got %d", removed)
		}
		for _, id := range oldIDs {
			if rec, _ := s.GetRecordByID(id); rec != nil {
				t.Errorf("Record %s older than 7 days should be deleted", id)
			}
		}
		if _, total, _ := s.GetPublicRecords(100, 0); total != 2 {
			t.Errorf("Expected 2 records kept, got %d", total)
		}
	})

	t.Run("delete by count only keeps newest", func(t *testing.T) {
		s := newTestStorage(t)
		ids := insertN(t, s, 5, 0)
		removed, err := s.PruneRecords(0, 3)
		if err != nil {
			t.Fatalf("PruneRecords failed: %v", err)
		}
		if removed != 2 {
			t.Errorf("Expected 2 removed, got %d", removed)
		}
		// The two oldest records (inserted first) must be gone, newest three kept
		for _, id := range ids[:2] {
			if rec, _ := s.GetRecordByID(id); rec != nil {
				t.Errorf("Oldest record %s should be deleted", id)
			}
		}
		for _, id := range ids[2:] {
			if rec, _ := s.GetRecordByID(id); rec == nil {
				t.Errorf("Newest record %s should be kept", id)
			}
		}
	})

	t.Run("combined days and count", func(t *testing.T) {
		s := newTestStorage(t)
		insertN(t, s, 3, 30) // removed by days
		ids := insertN(t, s, 4, 0)
		removed, err := s.PruneRecords(7, 3)
		if err != nil {
			t.Fatalf("PruneRecords failed: %v", err)
		}
		// 3 by age + 1 oldest of the remaining 4 by count
		if removed != 4 {
			t.Errorf("Expected 4 removed, got %d", removed)
		}
		for _, id := range ids[1:] {
			if rec, _ := s.GetRecordByID(id); rec == nil {
				t.Errorf("Newest record %s should be kept", id)
			}
		}
		if _, total, _ := s.GetPublicRecords(100, 0); total != 3 {
			t.Errorf("Expected 3 records kept, got %d", total)
		}
	})
}
