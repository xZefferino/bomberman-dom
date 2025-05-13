package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed
	maxMessageSize = 512
)

// Client represents a connected websocket client
type Client struct {
	ID       string
	Nickname string
	Hub      *Hub
	Conn     *websocket.Conn
	Send     chan []byte
	mu       sync.Mutex
}

// ReadMessages pumps messages from the websocket connection to the hub
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

// WriteMessages pumps messages from the hub to the websocket connection
func (c *Client) WriteMessages() {
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
				// The hub closed the channel
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message
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

// handleMessage processes received messages
func (c *Client) handleMessage(message Message) {
	switch message.Type {
	case "join":
		var payload struct {
			Nickname string `json:"nickname"`
		}
		if err := json.Unmarshal(message.Payload, &payload); err != nil {
			return
		}

		c.ID = message.PlayerID
		c.Nickname = payload.Nickname

	case "chat":
		var payload ChatMessage
		if err := json.Unmarshal(message.Payload, &payload); err != nil {
			return
		}

		c.Hub.SendChatMessage(c.ID, c.Nickname, payload.Message)

	case "action":
		var payload PlayerAction
		if err := json.Unmarshal(message.Payload, &payload); err != nil {
			return
		}

		// Pass the action to the game for processing
		c.Hub.HandlePlayerAction(payload)
	}
}
