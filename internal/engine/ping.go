package engine

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow cross-origin WebSocket connections for speed testing
	},
}

// PingMessage received from client
type PingMessage struct {
	Type       string `json:"type"`
	Seq        int64  `json:"seq"`
	ClientTime int64  `json:"client_time"`
}

// PongMessage returned to client
type PongMessage struct {
	Type       string `json:"type"`
	Seq        int64  `json:"seq"`
	ClientTime int64  `json:"client_time"`
	ServerTime int64  `json:"server_time"`
}

// ServePing handles continuous WebSocket ping probes
func ServePing(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[Ping WS] Upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Limit message size to 4KB to prevent memory exhaustion
	conn.SetReadLimit(4096)

	// Set read deadline to detect idle or disconnected clients
	_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))

	for {
		var msg PingMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[Ping WS] Read error: %v", err)
			}
			break
		}

		// Reset read deadline on receiving each valid probe
		_ = conn.SetReadDeadline(time.Now().Add(15 * time.Second))

		pong := PongMessage{
			Type:       "pong",
			Seq:        msg.Seq,
			ClientTime: msg.ClientTime,
			ServerTime: time.Now().UnixMilli(),
		}

		_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
		if err := conn.WriteJSON(pong); err != nil {
			break
		}
	}
}
