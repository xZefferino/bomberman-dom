package game

import (
	"errors"
	"math/rand"
	"sync"
	"time"
)

type GameState int

const (
	GameWaiting GameState = iota
	GameCountdown
	GameRunning
	GameFinished
)

type Game struct {
	ID        string
	Map       *GameMap
	Players   map[string]*Player
	Bombs     map[string]*Bomb
	PowerUps  map[string]PowerUp
	State     GameState
	StartTime time.Time
	mutex     sync.RWMutex

	// Timers for game flow
	CountdownTimer time.Time
	WaitingTimer   time.Time
}

// NewGame creates a new game instance
func NewGame() *Game {
	return &Game{
		ID:       GenerateUUID(),
		Map:      NewGameMap(),
		Players:  make(map[string]*Player),
		Bombs:    make(map[string]*Bomb),
		PowerUps: make(map[string]PowerUp),
		State:    GameWaiting,
	}
}

// AddPlayer adds a new player to the game
func (g *Game) AddPlayer(nickname string) (*Player, error) {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	if len(g.Players) >= 4 {
		return nil, errors.New("game is full")
	}

	// Determine starting position based on player count
	var startX, startY int
	switch len(g.Players) {
	case 0: // Top left
		startX, startY = 1, 1
	case 1: // Top right
		startX, startY = MapWidth-2, 1
	case 2: // Bottom left
		startX, startY = 1, MapHeight-2
	case 3: // Bottom right
		startX, startY = MapWidth-2, MapHeight-2
	}

	id := GenerateUUID()
	player := NewPlayer(id, nickname, startX, startY)
	g.Players[id] = player

	// Start the waiting timer when we have 2+ players
	if len(g.Players) == 2 {
		g.WaitingTimer = time.Now().Add(20 * time.Second)
	}

	// If 4 players have joined, start the countdown immediately
	if len(g.Players) == 4 {
		g.State = GameCountdown
		g.CountdownTimer = time.Now().Add(10 * time.Second)
	}

	return player, nil
}

// PlaceBomb places a bomb for a player
func (g *Game) PlaceBomb(playerID string) error {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	player, exists := g.Players[playerID]
	if !exists {
		return errors.New("player not found")
	}

	bomb := player.PlaceBomb(g.Map)
	if bomb == nil {
		return errors.New("cannot place more bombs")
	}

	g.Bombs[bomb.ID] = bomb
	return nil
}

// MovePlayer moves a player in the specified direction
func (g *Game) MovePlayer(playerID string, dx, dy int) error {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	player, exists := g.Players[playerID]
	if !exists {
		return errors.New("player not found")
	}

	player.Move(dx, dy, g.Map)

	// Check if player moved into a power-up
	for id, powerUp := range g.PowerUps {
		if player.Position.X == powerUp.Position.X && player.Position.Y == powerUp.Position.Y {
			player.ApplyPowerUp(powerUp)
			delete(g.PowerUps, id)
		}
	}

	return nil
}

// Update updates the game state
func (g *Game) Update() {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	now := time.Now()

	// Handle game state transitions
	switch g.State {
	case GameWaiting:
		// If we have at least 2 players and waiting timer has expired
		if len(g.Players) >= 2 && !g.WaitingTimer.IsZero() && now.After(g.WaitingTimer) {
			g.State = GameCountdown
			g.CountdownTimer = now.Add(10 * time.Second)
		}

	case GameCountdown:
		// Start the game when countdown is over
		if now.After(g.CountdownTimer) {
			g.State = GameRunning
			g.StartTime = now
		}

	case GameRunning:
		// Process bombs
		g.processBombs()

		// Check if game is over
		alivePlayers := 0
		for _, player := range g.Players {
			if player.Lives > 0 {
				alivePlayers++
			}
		}

		if alivePlayers <= 1 {
			g.State = GameFinished
		}
	}
}

// processBombs handles bomb explosions
func (g *Game) processBombs() {
	for bombID, bomb := range g.Bombs {
		if time.Since(bomb.PlacedAt) >= bomb.Timer {
			// Explode the bomb
			explosion := bomb.Explode(g.Map)

			// Handle explosion effects
			g.processExplosion(explosion)

			// Remove the bomb
			delete(g.Bombs, bombID)

			// Update player's active bombs count
			if player, exists := g.Players[bomb.PlayerID]; exists {
				player.BombExploded()
			}
		}
	}
}

// processExplosion handles the effects of an explosion
func (g *Game) processExplosion(explosion *Explosion) {
	// Check if any blocks were destroyed
	for _, pos := range explosion.Tiles {
		if g.Map.IsDestructible(pos) {
			g.Map.DestroyBlock(pos)

			// 30% chance to spawn a power-up
			if rand.Float32() < 0.3 {
				powerUp := SpawnPowerUp(pos)
				g.PowerUps[GenerateUUID()] = powerUp
			}
		}
	}

	// Check if any players were hit
	for _, player := range g.Players {
		for _, pos := range explosion.Tiles {
			if player.Position.X == pos.X && player.Position.Y == pos.Y {
				player.Hit()
				break
			}
		}
	}
}
