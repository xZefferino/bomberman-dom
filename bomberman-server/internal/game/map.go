package game

import (
	"math/rand"
	"time"
)

const (
	MapWidth  = 15
	MapHeight = 15
)

type BlockType int

const (
	Empty BlockType = iota
	Wall
	Destructible
)

type GameMap struct {
	Blocks  [][]BlockType
	Players []*Player
}

func NewGameMap() *GameMap {
	gm := &GameMap{
		Blocks:  make([][]BlockType, MapHeight),
		Players: make([]*Player, 0),
	}
	for i := range gm.Blocks {
		gm.Blocks[i] = make([]BlockType, MapWidth)
	}
	gm.generateMap()
	return gm
}

func (gm *GameMap) generateMap() {
	rand.Seed(time.Now().UnixNano())
	for y := 0; y < MapHeight; y++ {
		for x := 0; x < MapWidth; x++ {
			if x == 0 || x == MapWidth-1 || y == 0 || y == MapHeight-1 {
				gm.Blocks[y][x] = Wall
			} else if rand.Float32() < 0.3 {
				gm.Blocks[y][x] = Destructible
			} else {
				gm.Blocks[y][x] = Empty
			}
		}
	}
}

func (gm *GameMap) PlacePlayer(player *Player, x, y int) bool {
	if gm.Blocks[y][x] == Empty {
		gm.Players = append(gm.Players, player)
		return true
	}
	return false
}

// IsValidPosition checks if a position is within the bounds of the map
func (gm *GameMap) IsValidPosition(pos Position) bool {
	return pos.X >= 0 && pos.X < MapWidth && pos.Y >= 0 && pos.Y < MapHeight
}

// IsWall checks if a position contains a wall
func (gm *GameMap) IsWall(pos Position) bool {
	if !gm.IsValidPosition(pos) {
		return false
	}
	return gm.Blocks[pos.Y][pos.X] == Wall
}

// IsDestructible checks if a position contains a destructible block
func (gm *GameMap) IsDestructible(pos Position) bool {
	if !gm.IsValidPosition(pos) {
		return false
	}
	return gm.Blocks[pos.Y][pos.X] == Destructible
}

// IsEmpty checks if a position is empty
func (gm *GameMap) IsEmpty(pos Position) bool {
	if !gm.IsValidPosition(pos) {
		return false
	}
	return gm.Blocks[pos.Y][pos.X] == Empty
}

// DestroyBlock destroys a block at the given position
func (gm *GameMap) DestroyBlock(pos Position) bool {
	if !gm.IsDestructible(pos) {
		return false
	}
	gm.Blocks[pos.Y][pos.X] = Empty
	return true
}
