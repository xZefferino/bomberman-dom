package server

import (
	"encoding/json"
	"log"
	"net/http"

	"bomberman-server/internal/websocket"

	gorillaws "github.com/gorilla/websocket"
)

var upgrader = gorillaws.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// handleWebSocket handles WebSocket connections
func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	log.Println("WebSocket connection request received")
    
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error upgrading connection:", err)
		return
	}
    
	log.Println("WebSocket connection established")

	client := &websocket.Client{
		Hub:  s.Hub,
		Conn: conn,
		Send: make(chan []byte, 256),
	}

	s.Hub.Register <- client
	log.Println("Client registered with hub")

	// Start goroutines for reading and writing messages
	go client.ReadMessages()
	go client.WriteMessages()
}

// handleJoinGame handles a request to join the game
func (s *Server) handleJoinGame(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Nickname string `json:"nickname"`
	}

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&request); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	player, err := s.Game.AddPlayer(request.Nickname)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := map[string]interface{}{
		"playerID": player.ID,
		"status":   "joined",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleGameStatus returns the current game status
func (s *Server) handleGameStatus(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"state":       s.Game.State,
		"playerCount": len(s.Game.Players),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
