package game

import (
	"time"
)

type Bomb struct {
	ID       string
	Position Position
	Power    int
	PlayerID string
	PlacedAt time.Time
	Timer    time.Duration
}

type Explosion struct {
	Center   Position
	Range    int
	Tiles    []Position
	PlayerID string
}

func NewBomb(pos Position, power int, playerID string) *Bomb {
	return &Bomb{
		ID:       GenerateUUID(),
		Position: pos,
		Power:    power,
		PlayerID: playerID,
		PlacedAt: time.Now(),
		Timer:    3 * time.Second,
	}
}

func (b *Bomb) Explode(gameMap *GameMap) *Explosion {
	explosion := &Explosion{
		Center:   b.Position,
		Range:    b.Power,
		PlayerID: b.PlayerID,
		Tiles:    make([]Position, 0),
	}

	// Check explosion in all four directions
	directions := []Position{{0, 1}, {0, -1}, {1, 0}, {-1, 0}}
	for _, dir := range directions {
		for i := 1; i <= b.Power; i++ {
			pos := Position{
				X: b.Position.X + (dir.X * i),
				Y: b.Position.Y + (dir.Y * i),
			}

			if !gameMap.IsValidPosition(pos) {
				break
			}

			explosion.Tiles = append(explosion.Tiles, pos)

			// Stop if hit a wall
			if gameMap.IsWall(pos) {
				break
			}
		}
	}

	return explosion
}
