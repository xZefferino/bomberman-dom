// filepath: /bomberman-server/bomberman-server/pkg/types/game_types.go
package types

// PlayerAction represents the actions a player can take in the game.
type PlayerAction string

const (
    MoveUp    PlayerAction = "move_up"
    MoveDown  PlayerAction = "move_down"
    MoveLeft  PlayerAction = "move_left"
    MoveRight PlayerAction = "move_right"
    PlaceBomb  PlayerAction = "place_bomb"
)

// GameState represents the current state of the game.
type GameState struct {
    Players   []Player `json:"players"`
    Map       GameMap  `json:"map"`
    PowerUps  []PowerUp `json:"power_ups"`
    IsRunning bool      `json:"is_running"`
}

// Player represents a player in the game.
type Player struct {
    ID       string `json:"id"`
    Nickname string `json:"nickname"`
    Position Position `json:"position"`
    Lives    int    `json:"lives"`
}

// Position represents the coordinates of a player or object in the game.
type Position struct {
    X int `json:"x"`
    Y int `json:"y"`
}

// GameMap represents the structure of the game map.
type GameMap struct {
    Width  int      `json:"width"`
    Height int      `json:"height"`
    Blocks [][]Block `json:"blocks"`
}

// Block represents a block in the game map.
type Block struct {
    Type   string `json:"type"` // e.g., "destructible", "indestructible"
    IsDestroyed bool `json:"is_destroyed"`
}

// PowerUp represents a power-up item in the game.
type PowerUp struct {
    Type     string  `json:"type"` // e.g., "speed", "bomb_range"
    Position Position `json:"position"`
}