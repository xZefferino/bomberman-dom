import { h, render } from '../framework/index.js';
import { renderCharacterSprite } from './character.js';
import { renderBombSprite, BOMB_WIDTH, BOMB_HEIGHT } from './resources.js';


// Map block types (must match backend)
const BLOCK_GROUND = 0;        // brick1 (ground)
const BLOCK_WALL = 1;          // brick3 (indestructible)
const BLOCK_DESTRUCTIBLE = 2;  // brick2 (destructible)
const BLOCK_INDESTRUCTIBLE = 3;// brick3 (indestructible, interior)

const TILE_SIZE = 48; // px, adjust as needed

const SPRITE_FRAMES = 9;

// Sprite sources (replace with your actual paths)
const SPRITES = {
    ground: './aseets/sprites/brick1.png',
    destructible: './aseets/sprites/brick2.png',
    indestructible: './aseets/sprites/brick3.png',
    players: [
        './aseets/sprites/character1.png',
        './aseets/sprites/character2.png',
        './aseets/sprites/character3.png',
        './aseets/sprites/character4.png',
    ]
};

// Render a single tile (with layers)
function Tile({ type, x, y, player, isSelf }) {
    const layers = [
        h('img', {
            src: SPRITES.ground,
            style: `position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;`
        })
    ];
    if (type === BLOCK_WALL || type === BLOCK_INDESTRUCTIBLE) {
        layers.push(
            h('img', {
                src: SPRITES.indestructible,
                style: `position:absolute;left:0;top:0;width:100%;height:100%;z-index:3;`
            })
        );
    } else if (type === BLOCK_DESTRUCTIBLE) {
        layers.push(
            h('img', {
                src: SPRITES.destructible,
                style: `position:absolute;left:0;top:0;width:100%;height:100%;z-index:2;`
            })
        );
    }
   if (player) {
    const directionMap = {
        up: 0,
        left: 1,
        down: 2,
        right: 3,
    };
    const row = directionMap[player.direction || 'down'];
    const frame = player.frame || 0;
    const frameWidth = 64;
    const frameHeight = 96;
    const number = player.number || player.Number || 1; // ✅ Fix here

    layers.push(
        h('div', {
            style: `
                position:absolute;
                left:-8px; top:-48px;
                width:${frameWidth}px;
                height:${frameHeight}px;
                background: url(${SPRITES.players[number - 1]}) no-repeat;
                background-position: -${frame * frameWidth}px -${row * frameHeight}px;
                background-size: ${frameWidth * SPRITE_FRAMES}px ${frameHeight * 4}px;
                z-index:4;
                ${isSelf ? 'filter:drop-shadow(0 0 8px #0f0);' : ''}
            `
        })
    );
}



    return h('div', {
        style: `position:relative;width:${TILE_SIZE}px;height:${TILE_SIZE}px;display:inline-block;`
    }, ...layers);
}

// Render the whole board
export function GameBoard({ map, players, selfId, countdown, bombs }) {
    const playerGrid = {};
    players.forEach((p) => {
        const pos = p.position || p.Position;
        playerGrid[`${pos.y},${pos.x}`] = { ...p };
    });

    return h('div', {
        style: `display: flex; justify-content: center; align-items: center; width: 100%; height: 100vh;`
    }, 
        h('div', {
            style: `display:inline-block; background:#222; line-height:0; position:relative;`
        },
            ...(countdown > 0 ? [
                h('div', {
                    style: `position:absolute;left:0;top:0;width:100%;height:100%;z-index:10;
                            background:rgba(0,0,0,0.7);color:#fff;font-size:48px;
                            display:flex;align-items:center;justify-content:center;`
                }, `Game starts in ${countdown}`)
            ] : []),

            // 🔲 Render map tiles
            map.blocks.map((row, y) =>
                h('div', { style: 'display: flex;' },
                    row.map((type, x) =>
                        Tile({ type, x, y }) // no player logic here anymore
                    )
                )
            ),
            ...(bombs.map((bomb) => {
                const pos = bomb.position || bomb.Position;
                const frame = Math.floor(Date.now() / 150) % 7;

                const sprite = renderBombSprite({
                    imageUrl: './aseets/sprites/bomb.png',
                    frame
                });

                return h('div', {
                    key: bomb.ID || `bomb-${pos.x}-${pos.y}`,
                    style: `
                        position: absolute;
                        left: ${pos.x * TILE_SIZE}px;
                        top: ${pos.y * TILE_SIZE}px;
                        width: ${BOMB_WIDTH}px;
                        height: ${BOMB_HEIGHT}px;
                        z-index: 4;
                        pointer-events: none;
                    `
                }, h(sprite.tag, sprite.attrs));
            })),

            // 🧍 Render players absolutely on top
            ...players.map((p) => {
                const pos = p.position || p.Position;
                const number = p.number || p.Number || 1;
                const isSelf = p.ID === selfId;

                const rowMap = { up: 0, left: 1, down: 2, right: 3 };
                const row = rowMap[p.direction || 'down'];
                const frame = p.frame || 0;
                const frameWidth = 64;
                const frameHeight = 96;

                return h('div', {
                    key: p.ID,
                    style: `
                        position: absolute;
                        left: ${pos.x * TILE_SIZE - 8}px;
                        top: ${pos.y * TILE_SIZE - 48}px;
                        width: ${frameWidth}px;
                        height: ${frameHeight}px;
                        background: url(${SPRITES.players[number - 1]}) no-repeat;
                        background-position: -${frame * frameWidth}px -${row * frameHeight}px;
                        background-size: ${frameWidth * SPRITE_FRAMES}px ${frameHeight * 4}px;
                        z-index: 5;
                        transition: left 0.2s linear, top 0.2s linear;
                        ${isSelf ? 'filter:drop-shadow(0 0 8px #0f0);' : ''}
                    `
                });
            })
        )
    );
}


// Example usage (replace with real state/game data)
export function renderGame(root, gameState, selfId) {
    const state = gameState.state;

    console.log("✅ Full state object received:", state);

    if (!state || !state.map || !Array.isArray(state.map.blocks) || state.map.blocks.length === 0) {
        render(h('div', {}, '⚠️ Waiting for game to start...'), root);
        return;
    }

   render(
        GameBoard({
            map: state.map,
            players: state.map.players || [],
            selfId,
            countdown: state.countdown,
            bombs: state.bombs || []  // ✅ Pass bombs
        }),
        root
    );
}

