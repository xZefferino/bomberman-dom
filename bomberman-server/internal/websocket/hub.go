package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"bomberman-server/internal/game"
)

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	Broadcast chan []byte

	// Register requests from the clients
	Register chan *Client

	// Unregister requests from clients
	Unregister chan *Client

	// Game instance
	game *game.Game

	// Mutex for protecting client operations
	mutex sync.RWMutex
}

// NewHub creates a new hub with a game instance
func NewHub(game *game.Game) *Hub {
	return &Hub{
		Broadcast:  make(chan []byte),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		game:       game,
	}
}

// Run starts the hub and handles messages
func (h *Hub) Run() {
	ticker := time.NewTicker(50 * time.Millisecond) // 20 updates per second

	for {
		select {
		case client := <-h.Register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Println("New client connected")

			// Broadcast updated player count after registration
			h.mutex.RLock()
			count := len(h.clients)
			h.mutex.RUnlock()
			playerCountMsg, _ := json.Marshal(map[string]interface{}{
				"type":  "player_count",
				"count": count,
			})
			h.broadcastMessage(playerCountMsg)

		case client := <-h.Unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)

				if client.ID != "" {
					log.Printf("Player %s disconnected", client.ID)
					// TODO: Handle player disconnect in the game
				}
			}
			h.mutex.Unlock()

		case message := <-h.Broadcast:
			h.broadcastMessage(message)

		case <-ticker.C:
			// Update game state
			h.game.Update()

			// Broadcast updated game state
			h.SendGameState()
		}
	}
}

// broadcastMessage sends a message to all connected clients
func (h *Hub) broadcastMessage(message []byte) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	for client := range h.clients {
		select {
		case client.Send <- message:
		default:
			close(client.Send)
			delete(h.clients, client)
		}
	}
}

// SendGameState sends the current game state to all connected clients
func (h *Hub) SendGameState() {
	// Create game state update message
	update := GameStateUpdate{
		State:    int(h.game.State),
		Players:  h.game.Players,
		Bombs:    h.game.Bombs,
		PowerUps: h.game.PowerUps,
	}

	// Add timing information based on game state
	switch h.game.State {
	case game.GameCountdown:
		countdown := int(time.Until(h.game.CountdownTimer).Seconds())
		update.Countdown = countdown
	case game.GameRunning:
		elapsed := int(time.Since(h.game.StartTime).Seconds())
		update.ElapsedTime = elapsed
	}

	// Convert to JSON
	message, err := json.Marshal(map[string]interface{}{
		"type":  "gameState",
		"state": update,
	})

	if err != nil {
		log.Println("Error marshaling game state:", err)
		return
	}

	h.broadcastMessage(message)
}

// SendChatMessage sends a chat message from one player to all clients
func (h *Hub) SendChatMessage(playerID, playerName, message string) {
	chatMsg, err := json.Marshal(map[string]interface{}{
		"type":       "chat",
		"playerID":   playerID,
		"playerName": playerName,
		"message":    message,
		"timestamp":  time.Now().Format(time.RFC3339),
	})

	if err != nil {
		log.Println("Error marshaling chat message:", err)
		return
	}

	h.broadcastMessage(chatMsg)
}

// HandlePlayerAction processes player actions
func (h *Hub) HandlePlayerAction(action PlayerAction) {
	switch action.Action {
	case "move_up":
		h.game.MovePlayer(action.PlayerID, 0, -1)
	case "move_down":
		h.game.MovePlayer(action.PlayerID, 0, 1)
	case "move_left":
		h.game.MovePlayer(action.PlayerID, -1, 0)
	case "move_right":
		h.game.MovePlayer(action.PlayerID, 1, 0)
	case "place_bomb":
		h.game.PlaceBomb(action.PlayerID)
	}
}
