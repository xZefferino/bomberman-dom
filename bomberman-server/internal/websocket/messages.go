package websocket

import (
	"bomberman-server/internal/game"
	"encoding/json"
)

// Message represents a generic message structure for communication
type Message struct {
	Type     string          `json:"type"`
	PlayerID string          `json:"playerId"`
	Payload  json.RawMessage `json:"payload"`
}

// PlayerAction represents actions that a player can perform
type PlayerAction struct {
	PlayerID string `json:"playerId"`
	Action   string `json:"action"`
	X        int    `json:"x,omitempty"`
	Y        int    `json:"y,omitempty"`
}

// ChatMessage represents a chat message sent by a player
type ChatMessage struct {
	PlayerID string `json:"playerId"`
	Message  string `json:"message"`
}

// GameStateUpdate represents the current state of the game
type GameStateUpdate struct {
	State              int                     `json:"state"`
	Players            []*game.Player          `json:"players"`
	Bombs              []*game.Bomb            `json:"bombs"`
	PowerUps           map[string]game.PowerUp `json:"powerUps"`
	Map                *game.GameMap           `json:"map"`
	Explosions         []game.TimedExplosion   `json:"explosions"` // ✅ add this field
	Countdown          int                     `json:"countdown,omitempty"`
	ElapsedTime        int                     `json:"elapsedTime,omitempty"`
	LobbyJoinEndTime   int64                   `json:"lobbyJoinEndTime,omitempty"`   // Unix timestamp (milliseconds)
	InitialPlayerCount int                     `json:"initialPlayerCount,omitempty"` // Number of players at game start
}
