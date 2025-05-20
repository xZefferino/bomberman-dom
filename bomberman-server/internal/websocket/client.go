package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	// "bomberman-server/internal/game"
	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

type Client struct {
	ID       string
	Nickname string
	Hub      *Hub
	Conn     *websocket.Conn
	Send     chan []byte
	mu       sync.RWMutex // Changed from sync.Mutex to sync.RWMutex
}

func (c *Client) ReadMessages() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, rawMessage, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		var message Message
		if err := json.Unmarshal(rawMessage, &message); err != nil {
			log.Printf("Error parsing message: %v", err)
			continue
		}

		c.handleMessage(message)
	}
}

func (c *Client) WriteMessages() {
	log.Printf("Started WriteMessages for client")
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) handleMessage(message Message) {
	log.Printf("handleMessage: type=%s, playerId=%s, payload=%s", message.Type, message.PlayerID, string(message.Payload))
	switch message.Type {
	case "join":
		var payload struct {
			Nickname string `json:"nickname"`
		}
		if err := json.Unmarshal(message.Payload, &payload); err != nil {
			log.Printf("Failed to unmarshal join payload: %v", err)
			// Send error back to client
			errorMsg := Message{Type: "join_error", Payload: mustMarshal(map[string]string{"error": "Invalid join payload"})}
			if data, marshalErr := json.Marshal(errorMsg); marshalErr == nil {
				c.Send <- data
			}
			return
		}

		// Attempt to add or rejoin the player in the game logic.
		player, err := c.Hub.game.AddPlayer(message.PlayerID, payload.Nickname)
		if err != nil {
			log.Printf("Error adding/rejoining player %s (%s) to game: %v", payload.Nickname, message.PlayerID, err.Error())
			// Send join_error message to client
			errorDetails := map[string]string{
				"error":    err.Error(),
				"nickname": payload.Nickname,
				"playerId": message.PlayerID,
			}
			errorMsg := Message{
				Type:    "join_error",
				Payload: mustMarshal(errorDetails),
			}
			if data, marshalErr := json.Marshal(errorMsg); marshalErr == nil {
				c.Send <- data
			}
			// Do not proceed to set client ID/Nickname or send join_ack if AddPlayer failed
			return
		}

		// If AddPlayer was successful, 'player' is the authoritative player object.
		// Update the client struct's ID and Nickname.
		c.mu.Lock()
		c.ID = player.ID
		c.Nickname = player.Nickname
		c.mu.Unlock()
		log.Printf("Player %s (%s) successfully processed by Hub for join/rejoin. Client ID/Nickname updated.", c.Nickname, c.ID)

		// Send join_ack to the joining client
		ackPayload := map[string]string{
			"nickname": c.Nickname,
			"playerId": c.ID,
		}
		ack := Message{Type: "join_ack", Payload: mustMarshal(ackPayload)}
		if data, marshalErr := json.Marshal(ack); marshalErr == nil {
			log.Printf("✅ Sending join_ack to %s with nickname %s", c.ID, c.Nickname)
			c.Send <- data
		} else {
			log.Printf("Failed to marshal join_ack: %v", marshalErr)
			// Potentially return or handle error more gracefully
		}

		// Announce player join to all clients via the Hub
		// player.Number should be correctly assigned by AddPlayer
		c.Hub.BroadcastPlayerJoined(player.ID, player.Nickname, player.Number)

	case "chat":
		var payload struct {
			Message string `json:"message"`
		}
		if err := json.Unmarshal(message.Payload, &payload); err != nil {
			log.Printf("Failed to unmarshal chat payload: %v", err)
			return
		}
		c.mu.RLock() // This will now work
		clientID := c.ID
		clientNickname := c.Nickname
		c.mu.RUnlock() // This will now work
		// Pass the client's authoritative nickname from the client struct
		c.Hub.SendChatMessage(clientID, clientNickname, payload.Message)

	case "action":
		var payload PlayerAction
		if err := json.Unmarshal(message.Payload, &payload); err != nil {
			return
		}
		c.Hub.HandlePlayerAction(payload)

	case "restart_game":
		log.Printf("Received restart_game request from player %s", message.PlayerID)
		// Call the ResetGame method on the game instance via the hub.
		// This will initiate the 5-second countdown and proper reset sequence.
		c.Hub.game.ResetGame()
		// The game state will be broadcast by the hub's regular update loop once reset.
		log.Printf("Game reset sequence initiated by player %s", message.PlayerID)
	}
}
