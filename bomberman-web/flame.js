export const FLAME_WIDTH = 48;
export const FLAME_HEIGHT = 48;

export const FLAME_SPRITE_WIDTH = 128;
export const FLAME_SPRITE_HEIGHT = 128;
export const FLAME_TOTAL_FRAMES = 5;
export const FLAME_COLUMNS = 2;

const flameStyle = document.createElement('style');
flameStyle.textContent = `
    @keyframes flameFadeOut {
        0% { opacity: 1; }
        100% { opacity: 0; }
    }
`;
document.head.appendChild(flameStyle);

export function renderFlameSprite({ imageUrl, type = 'center', power = 1, frame = 0 }) {
    const frameIndex = frame % FLAME_TOTAL_FRAMES;

    const col = frameIndex % FLAME_COLUMNS;
    const row = Math.floor(frameIndex / FLAME_COLUMNS);
    const backgroundX = -col * FLAME_SPRITE_WIDTH;
    const backgroundY = -row * FLAME_SPRITE_HEIGHT;

    const sheetWidth = FLAME_SPRITE_WIDTH * FLAME_COLUMNS;
    const sheetHeight = FLAME_SPRITE_HEIGHT * Math.ceil(FLAME_TOTAL_FRAMES / FLAME_COLUMNS);

    const scaleFactor = type === 'center' ? 1 : power;

    return {
        tag: 'div',
        attrs: {
            style: `
                width: ${FLAME_WIDTH}px;
                height: ${FLAME_HEIGHT}px;
                background: url(${imageUrl}) no-repeat;
                background-position: ${backgroundX}px ${backgroundY}px;
                background-size: ${sheetWidth}px ${sheetHeight}px;
                image-rendering: pixelated;
                animation: flameFadeOut 0.5s forwards;
                transform-origin: center;
                z-index: 10;
                ${type === 'horizontal' ? `transform: scaleX(${scaleFactor});` : ''}
                ${type === 'vertical' ? `transform: scaleY(${scaleFactor});` : ''}
            `
        }
    };
}


// 🔁 Directional flame type helper
export function getFlameType(position, center, explosion) {
    if (position.x === center.x && position.y === center.y) {
        return 'center';
    }
    if (position.x === center.x) {
        return 'vertical';
    }
    if (position.y === center.y) {
        return 'horizontal';
    }
    return 'center'; // fallback
}
