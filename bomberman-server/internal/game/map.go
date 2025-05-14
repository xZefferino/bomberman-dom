package game

const (
	MapWidth  = 15
	MapHeight = 15
)

type BlockType int

const (
	Empty BlockType = iota
	Wall
	Destructible
	Indestructible
)

type GameMap struct {
	Blocks  [][]BlockType `json:"blocks"`
	Players []*Player     `json:"players"`
}

// Layout design using string values
var predefinedLayout = [][]string{
	{"#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#"},
	{"#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#"},
	{"#", " ", " ", "*", "*", "*", "*", "*", "*", "*", "*", "*", " ", " ", "#"},
	{"#", " ", "#", "*", "#", "*", "#", "*", "#", "*", "#", "*", "#", " ", "#"},
	{"#", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "#"},
	{"#", "*", "#", "*", "#", "*", "#", "*", "#", "*", "#", "*", "#", "*", "#"},
	{"#", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "#"},
	{"#", "*", "#", "*", "#", "*", "#", "*", "#", "*", "#", "*", "#", "*", "#"},
	{"#", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "#"},
	{"#", "*", "#", "*", "#", "*", "#", "*", "#", "*", "#", "*", "#", "*", "#"},
	{"#", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "#"},
	{"#", " ", "#", "*", "#", "*", "#", "*", "#", "*", "#", "*", "#", " ", "#"},
	{"#", " ", " ", "*", "*", "*", "*", "*", "*", "*", "*", "*", " ", " ", "#"},
	{"#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#"},
	{"#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#"},
}

// Converts the above string layout to BlockType
func (gm *GameMap) generateMap() {
	for y := 0; y < MapHeight; y++ {
		for x := 0; x < MapWidth; x++ {
			switch predefinedLayout[y][x] {
			case "#":
				gm.Blocks[y][x] = Indestructible
			case "*":
				gm.Blocks[y][x] = Destructible
			case " ":
				gm.Blocks[y][x] = Empty
			default:
				gm.Blocks[y][x] = Empty
			}
		}
	}
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

// Place player if tile is empty
func (gm *GameMap) PlacePlayer(player *Player, x, y int) bool {
	if gm.Blocks[y][x] == Empty {
		gm.Players = append(gm.Players, player)
		return true
	}
	return false
}

// --- Helpers below ---
func (gm *GameMap) IsValidPosition(pos Position) bool {
	return pos.X >= 0 && pos.X < MapWidth && pos.Y >= 0 && pos.Y < MapHeight
}

func (gm *GameMap) IsWall(pos Position) bool {
	return gm.IsValidPosition(pos) && gm.Blocks[pos.Y][pos.X] == Wall
}

func (gm *GameMap) IsDestructible(pos Position) bool {
	return gm.IsValidPosition(pos) && gm.Blocks[pos.Y][pos.X] == Destructible
}

func (gm *GameMap) IsEmpty(pos Position) bool {
	return gm.IsValidPosition(pos) && gm.Blocks[pos.Y][pos.X] == Empty
}

func (gm *GameMap) DestroyBlock(pos Position) bool {
	if !gm.IsDestructible(pos) {
		return false
	}
	gm.Blocks[pos.Y][pos.X] = Empty
	return true
}
