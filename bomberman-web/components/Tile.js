import { h } from '../framework/index.js';

// Tile component extracted from game.js
export function Tile({ type, x, y, player, isSelf, SPRITES, SPRITE_FRAMES, BLOCK_WALL, BLOCK_DESTRUCTIBLE, BLOCK_INDESTRUCTIBLE, TILE_SIZE }) {
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
        if (player && player.speed && player.speed > 1.0) {
            layers.push(
                h('div', {
                    style: `
                        position: absolute;
                        left: 0; top: 0;
                        width: 100%; height: 100%;
                        background: radial-gradient(circle, transparent 70%, rgba(255,255,0,0.3) 100%);
                        z-index: 3;
                    `
                })
            );
        }
    }
    return h('div', {
        style: `position:relative;width:${TILE_SIZE}px;height:${TILE_SIZE}px;display:inline-block;`
    }, ...layers);
}
