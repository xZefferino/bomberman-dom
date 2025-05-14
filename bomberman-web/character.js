export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 96;
export const SPRITE_FRAMES = 9; // 9 frames per row
export const SPRITE_DIRECTIONS = {
    up: 0,
    left: 1,
    down: 2,
    right: 3,
};

// Renders a sprite frame from sheet
export function renderCharacterSprite({ imageUrl, direction = 'down', frame = 0, isSelf = false, number = 1 }) {
    const row = SPRITE_DIRECTIONS[direction] || 2;
    const backgroundX = -frame * TILE_WIDTH;
    const backgroundY = -row * TILE_HEIGHT;

    return {
        tag: 'div',
        attrs: {
            style: `
                position:absolute;
                left:0;
                top:0;
                width:${TILE_WIDTH}px;
                height:${TILE_HEIGHT}px;
                background: url(${imageUrl}) no-repeat;
                background-position: ${backgroundX}px ${backgroundY}px;
                background-size: ${TILE_WIDTH * SPRITE_FRAMES}px ${TILE_HEIGHT * 4}px;
                z-index:4;
                ${isSelf ? 'filter:drop-shadow(0 0 8px #0f0);' : ''}
            `
        }
    };
}

