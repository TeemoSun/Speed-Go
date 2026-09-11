package engine

import (
	"crypto/rand"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
)

const (
	// BufferSize 8MB static pseudo-random buffer to prevent network compression
	BufferSize = 8 * 1024 * 1024
)

var (
	staticRandomBlock []byte
	initOnce          sync.Once
)

// initStaticBuffer initializes the 8MB static random block once
func initStaticBuffer() {
	staticRandomBlock = make([]byte, BufferSize)
	// Fill with crypto random data so gzip/deflate or transparent middleboxes cannot compress it
	if _, err := io.ReadFull(rand.Reader, staticRandomBlock); err != nil {
		// Fallback simple pseudo-random generation if crypto/rand fails
		for i := range staticRandomBlock {
			staticRandomBlock[i] = byte((i*1103515245 + 12345) & 0xFF)
		}
	}
}

// RepeatingReader is an io.Reader that loops over staticRandomBlock without allocating new memory
type RepeatingReader struct {
	offset int
	remain int64
}

// NewRepeatingReader creates a reader that will yield exactly `totalBytes` from staticRandomBlock
func NewRepeatingReader(totalBytes int64) *RepeatingReader {
	initOnce.Do(initStaticBuffer)
	return &RepeatingReader{
		offset: 0,
		remain: totalBytes,
	}
}

func (r *RepeatingReader) Read(p []byte) (n int, err error) {
	if r.remain <= 0 {
		return 0, io.EOF
	}

	toRead := int64(len(p))
	if toRead > r.remain {
		toRead = r.remain
	}

	n = 0
	for int64(n) < toRead {
		chunk := int64(len(staticRandomBlock) - r.offset)
		needed := toRead - int64(n)
		if chunk > needed {
			chunk = needed
		}

		copy(p[n:], staticRandomBlock[r.offset:r.offset+int(chunk)])
		n += int(chunk)
		r.offset = (r.offset + int(chunk)) % len(staticRandomBlock)
	}

	r.remain -= int64(n)
	return n, nil
}

// ParseSize parses string size like "50M", "100MB", "1048576" into bytes
func ParseSize(s string, defaultBytes int64) int64 {
	s = strings.TrimSpace(strings.ToUpper(s))
	if s == "" {
		return defaultBytes
	}

	multiplier := int64(1)
	if strings.HasSuffix(s, "GB") || strings.HasSuffix(s, "G") {
		multiplier = 1024 * 1024 * 1024
		s = strings.TrimRight(s, "GB")
	} else if strings.HasSuffix(s, "MB") || strings.HasSuffix(s, "M") {
		multiplier = 1024 * 1024
		s = strings.TrimRight(s, "MB")
	} else if strings.HasSuffix(s, "KB") || strings.HasSuffix(s, "K") {
		multiplier = 1024
		s = strings.TrimRight(s, "KB")
	}

	s = strings.TrimSpace(s)
	val, err := strconv.ParseInt(s, 10, 64)
	if err != nil || val <= 0 {
		return defaultBytes
	}
	return val * multiplier
}

// ServeDownload handles download speedtest requests with zero allocations
func ServeDownload(w http.ResponseWriter, r *http.Request, maxChunkMB int) {
	defaultBytes := int64(25 * 1024 * 1024) // 25MB default
	maxBytes := int64(maxChunkMB) * 1024 * 1024
	if maxBytes <= 0 {
		maxBytes = 512 * 1024 * 1024 // 512MB safety cap
	}

	reqBytes := ParseSize(r.URL.Query().Get("size"), defaultBytes)
	if reqBytes > maxBytes {
		reqBytes = maxBytes
	}

	// Disable HTTP compression and caching
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", "attachment; filename=speedtest.dat")
	w.Header().Set("Content-Encoding", "identity")
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Content-Length", strconv.FormatInt(reqBytes, 10))

	reader := NewRepeatingReader(reqBytes)
	_, _ = io.Copy(w, reader)
}
