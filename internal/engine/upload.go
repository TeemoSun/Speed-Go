package engine

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"sync"
	"time"
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

// ServeUpload drains the client's request body with minimal memory overhead and timeout enforcement
func ServeUpload(w http.ResponseWriter, r *http.Request, maxTestTimeSec int) {
	if maxTestTimeSec <= 0 {
		maxTestTimeSec = 30
	}

	// 1. Set TCP socket read deadline if supported by ResponseController
	rc := http.NewResponseController(w)
	_ = rc.SetReadDeadline(time.Now().Add(time.Duration(maxTestTimeSec) * time.Second))

	// 2. Request context timeout
	ctx, cancel := context.WithTimeout(r.Context(), time.Duration(maxTestTimeSec)*time.Second)
	defer cancel()

	bufPtr := uploadBufPool.Get().(*[]byte)
	defer uploadBufPool.Put(bufPtr)

	// Stream and discard directly into io.Discard with timeout-aware context
	body := &contextReader{ctx: ctx, r: r.Body}
	n, err := io.CopyBuffer(io.Discard, body, *bufPtr)
	_ = r.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")

	if err != nil && err != io.EOF {
		status := http.StatusBadRequest
		if ctx.Err() == context.DeadlineExceeded || err == context.DeadlineExceeded {
			status = http.StatusRequestTimeout
		}
		w.WriteHeader(status)
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

// contextReader checks context cancellation between reads
type contextReader struct {
	ctx context.Context
	r   io.Reader
}

func (cr *contextReader) Read(p []byte) (n int, err error) {
	select {
	case <-cr.ctx.Done():
		return 0, cr.ctx.Err()
	default:
		return cr.r.Read(p)
	}
}

