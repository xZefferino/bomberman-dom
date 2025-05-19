package game

import "time" // Ensure time package is imported

type Position struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type Player struct {
	ID          string   `json:"id"`
	Nickname    string   `json:"nickname"`
	Position    Position `json:"position"`
	Lives       int      `json:"lives"`
	Speed       float64  `json:"speed"`
	MaxBombs    int      `json:"maxBombs"`
	BombPower   int      `json:"bombPower"`
	ActiveBombs int      `json:"activeBombs"`
	Direction   string   `json:"direction"`
	Frame       int      `json:"frame"`
	Number      int      `json:"number"` // <-- add this
	IsConnected bool     `json:"-"` // Server-side flag
	DisconnectedAt time.Time `json:"-"` // Server-side timestamp
}

// NewPlayer creates a new player with default values
func NewPlayer(id, nickname string, startX, startY int) *Player {
	return &Player{
		ID:             id,
		Nickname:       nickname,
		Position:       Position{X: startX, Y: startY},
		Lives:          PLAYER_MAX_LIVES, // Use constant if available, otherwise 3
		Speed:          1.0,
		MaxBombs:       1,
		BombPower:      1,
		ActiveBombs:    0,
		IsConnected:    true,
		DisconnectedAt: time.Time{},
	}
}

func (p *Player) Move(dx, dy int, gameMap *GameMap) bool {
	newPos := Position{
		X: p.Position.X + dx,
		Y: p.Position.Y + dy,
	}

	if gameMap.IsValidPosition(newPos) && gameMap.IsEmpty(newPos) {
		p.Position = newPos

		// Set direction based on input
		switch {
		case dx == 1:
			p.Direction = "right"
		case dx == -1:
			p.Direction = "left"
		case dy == 1:
			p.Direction = "down"
		case dy == -1:
			p.Direction = "up"
		}

		return true
	}
	return false
}

func (p *Player) PlaceBomb(gameMap *GameMap) *Bomb {
	if p.ActiveBombs >= p.MaxBombs {
		return nil
	}

	bomb := NewBomb(p.Position, p.BombPower, p.ID)
	p.ActiveBombs++
	return bomb
}

func (p *Player) BombExploded() {
	if p.ActiveBombs > 0 {
		p.ActiveBombs--
	}
}

func (p *Player) Hit() bool {
	p.Lives--
	return p.Lives <= 0 // Returns true if player is eliminated
}

func (p *Player) ApplyPowerUp(powerUp PowerUp) {
	switch powerUp.Type {
	case PowerUpSpeed:
		// More meaningful speed increments
		// First power-up gives +0.3, second +0.4, etc.
		// This creates a more noticeable but not overwhelming effect
		if p.Speed < 1.0 {
			// First speed upgrade
			p.Speed = 1.0
		} else if p.Speed < 1.5 {
			// Second speed upgrade
			p.Speed = 1.5
		} else if p.Speed < 2.0 {
			// Third speed upgrade
			p.Speed = 2.0
		} else {
			// Additional upgrades cap at 2.5
			p.Speed = 2.5
		}
	case PowerUpBomb:
		p.MaxBombs++
	case PowerUpFlame:
		p.BombPower++
	}
}
