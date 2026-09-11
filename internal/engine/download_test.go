package engine

import (
	"bytes"
	"io"
	"testing"
)

func TestParseSize(t *testing.T) {
	tests := []struct {
		input    string
		expected int64
	}{
		{"10M", 10 * 1024 * 1024},
		{"50MB", 50 * 1024 * 1024},
		{"1G", 1024 * 1024 * 1024},
		{"500K", 500 * 1024},
		{"1048576", 1048576},
		{"", 25 * 1024 * 1024},
		{"invalid", 25 * 1024 * 1024},
	}

	for _, tt := range tests {
		res := ParseSize(tt.input, 25*1024*1024)
		if res != tt.expected {
			t.Errorf("ParseSize(%q) = %d; want %d", tt.input, res, tt.expected)
		}
	}
}

func TestRepeatingReader(t *testing.T) {
	totalBytes := int64(10 * 1024 * 1024) // 10MB
	reader := NewRepeatingReader(totalBytes)

	buf := make([]byte, 64*1024) // 64KB read chunk
	var readCount int64

	for {
		n, err := reader.Read(buf)
		readCount += int64(n)
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatalf("Unexpected read error: %v", err)
		}
	}

	if readCount != totalBytes {
		t.Fatalf("Expected to read %d bytes, got %d", totalBytes, readCount)
	}

	// Verify non-zero data
	if bytes.Equal(buf, make([]byte, len(buf))) {
		t.Fatalf("Buffer contains only zeroes; expected pseudo-random data")
	}
}
