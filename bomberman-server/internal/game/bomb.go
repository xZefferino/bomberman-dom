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
		Tiles:    []Position{b.Position}, // include center of explosion
	}

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

			block := gameMap.Blocks[pos.Y][pos.X]

			// Stop if indestructible
			if block == Indestructible {
				break
			}

			explosion.Tiles = append(explosion.Tiles, pos)

			// Stop if destructible — it will be destroyed, but don't go beyond it
			if block == Destructible {
				break
			}
		}
	}

	return explosion
}

