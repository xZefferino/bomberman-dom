import { h } from '../framework/index.js';

// Tile component extracted from game.js
export function Tile({ type, x, y, SPRITES, SPRITE_FRAMES, BLOCK_WALL, BLOCK_DESTRUCTIBLE, BLOCK_INDESTRUCTIBLE, TILE_SIZE }) {
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
    return h('div', {
        style: `position:relative;width:${TILE_SIZE}px;height:${TILE_SIZE}px;display:inline-block;`
    }, ...layers);
}
