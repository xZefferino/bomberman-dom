package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

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
	mu       sync.Mutex
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
			return
		}

		c.ID = message.PlayerID
		c.Nickname = payload.Nickname
		log.Printf("Registering player: %s (%s)", c.Nickname, c.ID)

		// Always attempt AddPlayer, but still send join_ack even if it fails
		_, err := c.Hub.game.AddPlayer(c.ID, c.Nickname)
		if err != nil {
			log.Printf("AddPlayer error: %v", err)
			// Still continue — this may be a reconnect or game full, but we want chat to work
		}

		ack := Message{
			Type: "join_ack",
			Payload: mustMarshal(map[string]string{
				"nickname": c.Nickname,
				"playerId": c.ID,
			}),
		}
		data, err := json.Marshal(ack)
		if err != nil {
			log.Printf("Failed to marshal join_ack: %v", err)
			return
		}

		log.Printf("✅ Sending join_ack to %s with nickname %s", c.ID, c.Nickname)
		c.Send <- data


	case "chat":
		log.Printf("Received chat message: %s", string(message.Payload))
		var payload ChatMessage
		if err := json.Unmarshal(message.Payload, &payload); err != nil {
			log.Printf("Failed to unmarshal chat payload: %v", err)
			return
		}
		log.Printf("Parsed chat payload: %+v", payload)
		log.Printf("Sending chat from ID=%s name=%s", c.ID, c.Nickname)
		c.Hub.SendChatMessage(c.ID, c.Nickname, payload.Message)

	case "action":
		var payload PlayerAction
		if err := json.Unmarshal(message.Payload, &payload); err != nil {
			return
		}
		c.Hub.HandlePlayerAction(payload)
	}
}

