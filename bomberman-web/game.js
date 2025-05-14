import { h, render } from '../framework/index.js';

// Map block types (must match backend)
const BLOCK_GROUND = 0;
const BLOCK_WALL = 1;
const BLOCK_DESTRUCTIBLE = 2;
const BLOCK_INDESTRUCTIBLE = 3;

const TILE_SIZE = 48;
const SPRITE_FRAMES = 9;

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
        const number = player.number || player.Number || 1;

        layers.push(
            h('div', {
                style: `
                    position: absolute;
                    left: -8px;
                    top: -48px;
                    width: ${frameWidth}px;
                    height: ${frameHeight}px;
                    background: url(${SPRITES.players[number - 1]}) no-repeat;
                    background-position: -${frame * frameWidth}px -${row * frameHeight}px;
                    background-size: ${frameWidth * SPRITE_FRAMES}px ${frameHeight * 4}px;
                    z-index: 4;
                    ${isSelf ? 'filter: drop-shadow(0 0 8px #0f0);' : ''}
                `
            })
        );
    }

    return h('div', {
        style: `position:relative;width:${TILE_SIZE}px;height:${TILE_SIZE}px;display:inline-block;`
    }, ...layers);
}

// Render the whole board
export function GameBoard({ map, players, selfId, countdown }) {
    const playerGrid = {};
    players.forEach((p) => {
        const pos = p.position || p.Position;
        playerGrid[`${pos.y},${pos.x}`] = { ...p };
    });

    return h('div', {
        style: `display: flex; justify-content: center; align-items: center; width: 100%; height: 100vh;`
    },
        h('div', {
            style: `display:inline-block;background:#222;line-height:0;position:relative;`
        },
            ...(countdown > 0 ? [
                h('div', {
                    style: `position:absolute;left:0;top:0;width:100%;height:100%;z-index:10;
                            background:rgba(0,0,0,0.7);color:#fff;font-size:48px;
                            display:flex;align-items:center;justify-content:center;`
                }, `Game starts in ${countdown}`)
            ] : []),

            map.blocks.map((row, y) =>
                h('div', { style: 'display: flex;' },
                    row.map((type, x) =>
                        Tile({
                            type,
                            x,
                            y,
                            player: playerGrid[`${y},${x}`],
                            isSelf: playerGrid[`${y},${x}`] && playerGrid[`${y},${x}`].ID === selfId
                        })
                    )
                )
            )
        )
    );
}

// Example usage
export function renderGame(root, gameState, selfId) {
    const state = gameState.state;

    if (!state || !state.map || !Array.isArray(state.map.blocks) || state.map.blocks.length === 0) {
        render(h('div', {}, '⚠️ Waiting for game to start...'), root);
        return;
    }

    render(
        GameBoard({
            map: state.map,
            players: state.map.players || [],
            selfId,
            countdown: state.countdown
        }),
        root
    );
}
