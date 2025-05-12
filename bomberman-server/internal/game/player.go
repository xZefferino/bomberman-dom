package game

type Player struct {
	ID          string
	Nickname    string
	Position    Position
	Lives       int
	Speed       float64
	MaxBombs    int
	BombPower   int
	ActiveBombs int
}

// NewPlayer creates a new player with default values
func NewPlayer(id, nickname string, startX, startY int) *Player {
	return &Player{
		ID:          id,
		Nickname:    nickname,
		Position:    Position{X: startX, Y: startY},
		Lives:       3,
		Speed:       1.0,
		MaxBombs:    1,
		BombPower:   1,
		ActiveBombs: 0,
	}
}

func (p *Player) Move(x, y int, gameMap *GameMap) bool {
	newPos := Position{
		X: p.Position.X + x,
		Y: p.Position.Y + y,
	}

	// Check if the new position is valid and not blocked
	if gameMap.IsValidPosition(newPos) && !gameMap.IsWall(newPos) && !gameMap.IsDestructible(newPos) {
		p.Position = newPos
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
		p.Speed += 0.2
	case PowerUpBomb:
		p.MaxBombs++
	case PowerUpFlame:
		p.BombPower++
	}
}
