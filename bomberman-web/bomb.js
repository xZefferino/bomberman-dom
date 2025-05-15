export const BOMB_WIDTH = 48;
export const BOMB_HEIGHT = 48;
export const BOMB_FRAMES = 7;
export const BOMB_FRAME_DURATION = 150; // ms per frame

// Renders a bomb with simple frame-based animation
export function renderBombSprite({ imageUrl, frame = 0 }) {
    const backgroundX = -frame * BOMB_WIDTH;

    return {
        tag: 'div',
        attrs: {
            style: `
                position:absolute;
                left:0;
                top:0;
                width:${BOMB_WIDTH}px;
                height:${BOMB_HEIGHT}px;
                background: url(${imageUrl}) no-repeat;
                background-position: ${backgroundX}px 0;
                background-size: ${BOMB_WIDTH * BOMB_FRAMES}px ${BOMB_HEIGHT}px;
                z-index: 3;
            `
        }
    };
}
