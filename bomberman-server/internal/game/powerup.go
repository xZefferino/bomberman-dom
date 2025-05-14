package game

import "math/rand"

// PowerUp represents a power-up item in the game.
type PowerUp struct {
	ID       string
	Type     string
	Position Position
}

const (
	PowerUpSpeed = "speed" // Increases movement speed
	PowerUpBomb  = "bomb"  // Increases the amount of bombs dropped at a time by 1
	PowerUpFlame = "flame" // Increases explosion range from the bomb in four directions by 1 block
)

// SpawnPowerUp spawns a power-up at a given position.
func SpawnPowerUp(position Position) PowerUp {
	powerUpTypes := []string{PowerUpSpeed, PowerUpBomb, PowerUpFlame}
	randomType := powerUpTypes[rand.Intn(len(powerUpTypes))]
	return PowerUp{
		ID:       GenerateUUID(),
		Type:     randomType,
		Position: position,
	}
}
