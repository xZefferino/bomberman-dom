package game

import (
	"errors"
	"log"
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
	GameResetting // New state for the 5-second countdown
)

const PLAYER_MAX_LIVES = 3              // Define max lives for a player
const LOBBY_JOIN_WINDOW_SECONDS = 20    // Time in seconds for lobby to remain open after 2nd player joins
const GAME_START_COUNTDOWN_SECONDS = 10 // Time in seconds for the game to start
const GAME_RESET_COUNTDOWN_SECONDS = 5  // Time in seconds for the game to reset
const DISCONNECT_GRACE_PERIOD = 10 * time.Second // Grace period for reconnections

type TimedExplosion struct {
	*Explosion
	CreatedAt time.Time `json:"createdAt"`
}

type Game struct {
	ID        string
	Map       *GameMap
	Players   map[string]*Player
	Bombs     map[string]*Bomb
	PowerUps  map[string]PowerUp
	State     GameState
	StartTime time.Time
	Mutex     sync.RWMutex

	// Timers for game flow
	CountdownTimer     time.Time
	WaitingTimer       time.Time
	ResetTimer         time.Time        // Timer for the reset countdown
	NextPlayerNumber   int              // ✅ NEW
	Explosions         []TimedExplosion `json:"explosions"`
	InitialPlayerCount int              // Number of players when the game started
}

// NewGame creates a new game instance
func NewGame() *Game {
	return &Game{
		ID:                 GenerateUUID(),
		Map:                NewGameMap(),
		Players:            make(map[string]*Player),
		Bombs:              make(map[string]*Bomb),
		PowerUps:           make(map[string]PowerUp),
		State:              GameWaiting,
		NextPlayerNumber:   1, // ✅ Start from 1
		InitialPlayerCount: 0, // Initialize
	}
}

// AddPlayer adds a new player to the game or re-activates an existing one.
func (g *Game) AddPlayer(id, nickname string) (*Player, error) {
	g.Mutex.Lock()
	defer g.Mutex.Unlock()

	// Check if player already exists (rejoin attempt)
	if existingPlayer, ok := g.Players[id]; ok {
		log.Printf("Player %s (%s) is rejoining.", nickname, id)
		existingPlayer.Nickname = nickname // Update nickname if changed
		existingPlayer.IsConnected = true   // Mark as connected
		existingPlayer.DisconnectedAt = time.Time{} // Clear disconnect time

		// If rejoining in the waiting state, reset their lives
		if g.State == GameWaiting {
			existingPlayer.Lives = PLAYER_MAX_LIVES // Reset lives
			log.Printf("Player %s (%s) rejoining lobby, lives reset to %d.", nickname, id, existingPlayer.Lives)
		} else {
			// Policy for rejoining a game in progress (Countdown, Running, Finished)
			// Player continues with their current state (e.g., if they were dead, they stay dead unless revived by other game mechanics)
			log.Printf("Player %s (%s) rejoining game in state %v. Current lives: %d.", nickname, id, g.State, existingPlayer.Lives)
		}
		return existingPlayer, nil
	}

	// --- Logic for NEW player ---

	// Prevent joining if game is in countdown, running, or finished
	if g.State == GameCountdown || g.State == GameRunning || g.State == GameFinished {
		return nil, errors.New("game has already started or is finished")
	}

	// Prevent joining if lobby is full
	if len(g.Players) >= 4 {
		return nil, errors.New("lobby is full")
	}

	// Prevent joining if lobby window is active and has expired
	if g.State == GameWaiting && !g.WaitingTimer.IsZero() && time.Now().After(g.WaitingTimer) {
		return nil, errors.New("lobby join window has closed")
	}

	// Fixed slot list, ordered
	slots := []struct {
		X, Y int
	}{
		{1, 2},   // Player 1
		{13, 2},  // Player 2
		{1, 12},  // Player 3
		{13, 12}, // Player 4
	}

	slotIndex := len(g.Players)
	if slotIndex >= len(slots) {
		return nil, errors.New("no slot available")
	}
	slot := slots[slotIndex]

	player := NewPlayer(id, nickname, slot.X, slot.Y) // NewPlayer should initialize lives to PLAYER_MAX_LIVES
	player.Number = slotIndex + 1
	// Ensure IsConnected is true and DisconnectedAt is zeroed by NewPlayer or set here
	player.IsConnected = true
	player.DisconnectedAt = time.Time{}


	g.Players[id] = player
	g.Map.PlacePlayer(player, slot.X, slot.Y)

	log.Printf("✅ Assigned new player %s -> Number: %d | Pos: (%d,%d)", nickname, player.Number, slot.X, slot.Y)

	// Start lobby join timer if this is the second player and game is waiting
	if len(g.Players) == 2 && g.State == GameWaiting && g.WaitingTimer.IsZero() {
		g.WaitingTimer = time.Now().Add(LOBBY_JOIN_WINDOW_SECONDS * time.Second)
		log.Printf("Lobby join window started for %d seconds. Ends at: %v", LOBBY_JOIN_WINDOW_SECONDS, g.WaitingTimer)
	}

	// If 4 players join while waiting, immediately move to countdown
	if len(g.Players) == 4 && g.State == GameWaiting {
		log.Printf("Lobby full with 4 players. Moving to game countdown.")
		g.State = GameCountdown
		g.CountdownTimer = time.Now().Add(GAME_START_COUNTDOWN_SECONDS * time.Second)
		if !g.WaitingTimer.IsZero() {
			g.WaitingTimer = time.Time{} // Clear lobby join timer
		}
	}

	return player, nil
}

// PlaceBomb places a bomb for a player
func (g *Game) PlaceBomb(playerID string) error {
	g.Mutex.Lock()
	defer g.Mutex.Unlock()

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
	g.Mutex.Lock()
	defer g.Mutex.Unlock()

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
    g.Mutex.Lock()
    defer g.Mutex.Unlock()
    now := time.Now()

    // Handle disconnected players
    for _, p := range g.Players { // Changed playerID to _
        if !p.IsConnected && !p.DisconnectedAt.IsZero() && now.Sub(p.DisconnectedAt) > DISCONNECT_GRACE_PERIOD {
            if p.Lives > 0 {
                log.Printf("Player %s (%s) disconnect grace period expired. Marking as dead.", p.Nickname, p.ID)
                p.Lives = 0
                // Player remains in g.Players but with 0 lives.
                // The game logic for checking alive players will handle game over conditions.
            }
            // Mark as processed for this disconnect event to avoid repeated logic if they stay in list with 0 lives
            p.DisconnectedAt = time.Time{}
        }
    }

    // Handle game state transitions
    switch g.State {
    case GameWaiting:
        // Check if lobby join window has expired (and at least 2 players)
        if !g.WaitingTimer.IsZero() && now.After(g.WaitingTimer) && len(g.Players) >= 2 {
            log.Printf("Lobby join window expired with %d players. Moving to game countdown.", len(g.Players))
            g.State = GameCountdown
            g.CountdownTimer = now.Add(GAME_START_COUNTDOWN_SECONDS * time.Second) // Use constant
            g.WaitingTimer = time.Time{}                                           // Clear lobby join timer
        }

    case GameCountdown:
        // Start the game when countdown is over
        if now.After(g.CountdownTimer) {
            log.Println("Game countdown finished. Starting game.")
            g.State = GameRunning
            g.StartTime = now
            g.InitialPlayerCount = len(g.Players) // Set initial player count
        }

    case GameRunning:
        // Process bombs
        g.processBombs()

        // Check if game is over
        alivePlayers := 0
        if len(g.Players) > 0 { // Only check if there were players to begin with
            for _, p := range g.Players {
                if p.Lives > 0 {
                    alivePlayers++
                }
            }
            // Game ends if 0 or 1 player is alive (and game had started with players)
            if alivePlayers <= 1 {
                log.Printf("Game finished. Alive players: %d", alivePlayers)
                g.State = GameFinished
                // Instead of just GameFinished, transition to GameResetting
                // g.State = GameResetting
                // g.ResetTimer = now.Add(GAME_RESET_COUNTDOWN_SECONDS * time.Second)
                // log.Printf("Game finished. Resetting in %d seconds.", GAME_RESET_COUNTDOWN_SECONDS)
            }
        } else if !g.StartTime.IsZero() { // If game started but no players (e.g. all disconnected)
            log.Println("Game finished as no players are left.")
            g.State = GameFinished
            // g.State = GameResetting
            // g.ResetTimer = now.Add(GAME_RESET_COUNTDOWN_SECONDS * time.Second)
            // log.Printf("Game ended with no players. Resetting in %d seconds.", GAME_RESET_COUNTDOWN_SECONDS)
        }

    case GameFinished:
        // This state is now a brief moment before GameResetting or if triggered externally.
        // We will initiate the reset timer here if not already set (e.g. by direct call to ResetGame)
        if g.ResetTimer.IsZero() {
            log.Println("GameFinished state reached, initiating reset countdown.")
            g.State = GameResetting
            g.ResetTimer = now.Add(GAME_RESET_COUNTDOWN_SECONDS * time.Second)
        }

    case GameResetting:
        if now.After(g.ResetTimer) {
            log.Println("Game reset countdown finished. Resetting game state.")
            // Perform the actual reset of the game state
            g.resetGameInternal()
            g.State = GameWaiting // Transition back to waiting for players
            log.Println("Game reset complete. Waiting for players.")
        }
    }

    // Update player list in map for sending state
    g.Map.Players = g.PlayersInSlotOrder()

    // Use the existing now variable
    filtered := make([]TimedExplosion, 0, len(g.Explosions))

    for _, exp := range g.Explosions {
        if now.Sub(exp.CreatedAt) < 500*time.Millisecond {
            filtered = append(filtered, exp)
        }
    }
    g.Explosions = filtered
}

// ResetGame is an exported method that can be called to trigger a game reset sequence.
func (g *Game) ResetGame() {
	g.Mutex.Lock()
	defer g.Mutex.Unlock()

	if g.State == GameResetting && !g.ResetTimer.IsZero() {
		log.Println("Game is already resetting.")
		return
	}

	log.Println("External request to reset game. Initiating reset countdown.")
	g.State = GameResetting
	g.ResetTimer = time.Now().Add(GAME_RESET_COUNTDOWN_SECONDS * time.Second)
	// No need to call resetGameInternal() here, Update() will handle it when timer expires
}

// resetGameInternal resets the game to its initial state (or a new game state)
// This is called by Update when the ResetTimer expires.
func (g *Game) resetGameInternal() {
	// This function assumes g.Mutex is already locked if called from Update()
	// or ResetGame(). If called directly, ensure locking.
	g.Map = NewGameMap()                     // Reset the map
	g.Players = make(map[string]*Player)     // Clear players
	g.Bombs = make(map[string]*Bomb)         // Clear bombs
	g.PowerUps = make(map[string]PowerUp)    // Clear power-ups
	g.State = GameWaiting                    // Set state to waiting
	g.StartTime = time.Time{}                // Reset start time
	g.CountdownTimer = time.Time{}           // Reset countdown timer
	g.WaitingTimer = time.Time{}             // Reset lobby waiting timer
	g.ResetTimer = time.Time{}               // Clear the reset timer itself
	g.NextPlayerNumber = 1                   // Reset player number assignments
	g.Explosions = make([]TimedExplosion, 0) // Clear explosions
	g.InitialPlayerCount = 0                 // Reset initial player count

	log.Println("Game has been reset internally.")
}

// processBombs handles bomb explosions
func (g *Game) processBombs() {
	for bombID, bomb := range g.Bombs {
		if time.Since(bomb.PlacedAt) >= bomb.Timer {
			// Explode the bomb
			explosion := bomb.Explode(g.Map)
			g.processExplosion(explosion)
			g.Explosions = append(g.Explosions, TimedExplosion{
				Explosion: explosion,
				CreatedAt: time.Now(),
			})

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

// PlayerNumbers returns a map of player IDs to their assigned numbers
func (g *Game) PlayerNumbers() map[string]int {
	g.Mutex.RLock()
	defer g.Mutex.RUnlock()
	numbers := make(map[string]int)
	i := 1
	for id := range g.Players {
		numbers[id] = i
		i++
	}
	return numbers
}

// GetPlayerNumber returns the assigned number of a specific player
func (g *Game) GetPlayerNumber(playerID string) int {
	g.Mutex.RLock()
	defer g.Mutex.RUnlock()
	i := 1
	for id := range g.Players {
		if id == playerID {
			return i
		}
		i++
	}
	return 0
}

func (g *Game) GetBombList() []*Bomb {
	g.Mutex.RLock()
	defer g.Mutex.RUnlock()

	bombList := make([]*Bomb, 0, len(g.Bombs))
	for _, bomb := range g.Bombs {
		bombList = append(bombList, bomb)
	}
	return bombList
}

// PlayersInSlotOrder returns players sorted by their Number (slot)
func (g *Game) PlayersInSlotOrder() []*Player {
	ordered := make([]*Player, 0, 4)
	added := map[int]bool{} // prevent duplicates

	for slot := 1; slot <= 4; slot++ {
		for _, p := range g.Players {
			if p.Number == slot && !added[p.Number] {
				ordered = append(ordered, p)
				added[p.Number] = true
				break
			}
		}
	}
	return ordered
}

// HandlePlayerDisconnect is called when a player's websocket connection is closed.
func (g *Game) HandlePlayerDisconnect(playerID string) {
	g.Mutex.Lock()
	defer g.Mutex.Unlock()

	player, ok := g.Players[playerID]
	if !ok {
		log.Printf("Player %s not found for disconnect handling.", playerID)
		return
	}

    // Mark the player as disconnected and start grace period timer.
    // Don't immediately set lives to 0.
    if player.IsConnected { // Only process if they were marked as connected
        player.IsConnected = false
        player.DisconnectedAt = time.Now()
        log.Printf("Player %s (%s) disconnected. Grace period of %v started.", player.Nickname, playerID, DISCONNECT_GRACE_PERIOD)
    }

    // Depending on your game rules, you might also remove the player from g.Players map
    // or move them to a list of disconnected players.
    // For now, just setting lives to 0 will make them appear dead.
    // If they were the last one alive, the game end logic should trigger naturally in Update().
}
