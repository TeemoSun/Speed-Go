package engine

import (
	"encoding/json"
	"io"
	"net/http"
	"sync"
)

var (
	// Reusable 32KB buffers for discarding incoming upload bodies
	uploadBufPool = sync.Pool{
		New: func() any {
			b := make([]byte, 32*1024)
			return &b
		},
	}
)

// UploadResponse returned to client after draining upload body
type UploadResponse struct {
	ReceivedBytes int64  `json:"received_bytes"`
	Status        string `json:"status"`
}

// ServeUpload drains the client's request body with minimal memory overhead
func ServeUpload(w http.ResponseWriter, r *http.Request) {
	bufPtr := uploadBufPool.Get().(*[]byte)
	defer uploadBufPool.Put(bufPtr)

	// Stream and discard directly into io.Discard
	n, err := io.CopyBuffer(io.Discard, r.Body, *bufPtr)
	_ = r.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")

	if err != nil && err != io.EOF {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(UploadResponse{
			ReceivedBytes: n,
			Status:        "error: " + err.Error(),
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(UploadResponse{
		ReceivedBytes: n,
		Status:        "ok",
	})
}
