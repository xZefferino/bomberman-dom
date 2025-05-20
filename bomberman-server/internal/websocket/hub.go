package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"bomberman-server/internal/game"
)

var loggedOnce = false

// var lastLogTime time.Time

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
					// Add this line:
					h.game.HandlePlayerDisconnect(client.ID) // Notify the game logic
				}
			}
			h.mutex.Unlock()

			// Broadcast updated player count after unregistration
			h.mutex.RLock()
			count := len(h.clients)
			h.mutex.RUnlock()
			playerCountMsg, _ := json.Marshal(map[string]interface{}{
				"type":  "player_count",
				"count": count,
				// Optionally, you can also send the lobbyJoinEndTime if relevant
				// "lobbyJoinEndTime": h.game.WaitingTimer.UnixMilli(),
			})
			h.broadcastMessage(playerCountMsg)

		case message := <-h.Broadcast:
			h.broadcastMessage(message)

		case <-ticker.C:
			h.game.Update()
			if !loggedOnce {
				log.Printf("Sending GameState. Map nil? %v", h.game.Map == nil)
				loggedOnce = true
			}
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
		State:      int(h.game.State),
		Players:    h.game.PlayersInSlotOrder(), // Use the ordered list of players
		Bombs:      h.game.GetBombList(),
		PowerUps:   h.game.PowerUps,
		Map:        h.game.Map,
		Explosions: h.game.Explosions,
	}

	if h.game.State == game.GameWaiting && !h.game.WaitingTimer.IsZero() {
		update.LobbyJoinEndTime = h.game.WaitingTimer.UnixMilli()
	}

	switch h.game.State {
	case game.GameCountdown:
		remainingCountdown := int(time.Until(h.game.CountdownTimer).Seconds())
		if remainingCountdown < 0 {
			remainingCountdown = 0
		}
		update.Countdown = remainingCountdown
	case game.GameRunning:
		update.ElapsedTime = int(time.Since(h.game.StartTime).Seconds())
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

// BroadcastPlayerJoined sends a message to all clients that a player has joined.
func (h *Hub) BroadcastPlayerJoined(playerID, playerName string, playerNumber int) {
	log.Printf("Broadcasting player join: %s (ID: %s, Number: %d)", playerName, playerID, playerNumber)
	payload := map[string]interface{}{
		"playerId":     playerID,
		"playerName":   playerName,
		"playerNumber": playerNumber, // Send the assigned player number
	}
	msg := Message{
		Type:    "player_joined_lobby",
		Payload: mustMarshal(payload),
	}
	data, _ := json.Marshal(msg)
	h.broadcastMessage(data) // This sends to all clients in h.clients
}

// SendChatMessage sends a chat message from one player to all clients
// It now uses the authoritative player details from the game state.
func (h *Hub) SendChatMessage(playerID, clientProvidedNickname, message string) {
	var authoritativeNickname string
	var authoritativePlayerNumber int
	foundInGame := false

	h.game.Mutex.RLock()
	if p, ok := h.game.Players[playerID]; ok {
		authoritativeNickname = p.Nickname // Use nickname from game state
		authoritativePlayerNumber = p.Number   // Use number from game state
		foundInGame = true
	}
	h.game.Mutex.RUnlock()

	if !foundInGame {
		// This case should be rare if the playerID is valid and player is in game
		log.Printf("Warning: Player %s not found in game.Players for chat. Using client-provided nickname: %s", playerID, clientProvidedNickname)
		authoritativeNickname = clientProvidedNickname
		if authoritativeNickname == "" {
			authoritativeNickname = "Unknown"
		}
		// authoritativePlayerNumber will remain 0 or you can assign a specific value for "unknown"
	}

	payload := map[string]interface{}{
		"playerId":     playerID,
		"playerName":   authoritativeNickname,
		"playerNumber": authoritativePlayerNumber,
		"message":      message,
	}
	msg := Message{
		Type:    "chat",
		Payload: mustMarshal(payload),
	}
	data, _ := json.Marshal(msg)
	h.broadcastMessage(data)
}

// Helper to marshal payload
func mustMarshal(v interface{}) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
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
