export const FLAME_WIDTH = 48;
export const FLAME_HEIGHT = 48;

export const FLAME_SPRITE_WIDTH = 40;
export const FLAME_SPRITE_HEIGHT = 40;
export const FLAME_TOTAL_FRAMES = 4;
export const FLAME_COLUMNS = 2; // Top row has 2 flames
export const FLAME_ROWS = 2;    // Two rows, each with 2 flames

const flameStyle = document.createElement('style');
flameStyle.textContent = `
    @keyframes flameFadeOut {
        66% { opacity: 1; }
        100% { opacity: 0; }
    }
`;
document.head.appendChild(flameStyle);

export function renderFlameSprite({ imageUrl, type = 'center', power = 1, frame = 0}) {
    if (frame >= FLAME_TOTAL_FRAMES) {

        return {
            tag: 'div',
            attrs: {
                style: `
                    width: ${FLAME_WIDTH}px;
                    height: ${FLAME_HEIGHT}px;
                    background-size: contain;
                    image-rendering: pixelated;
                    transform-origin: center;
                    z-index: 10;
                `
            }
        };
    }

    // For flame frames (0-3)
    const frameIndex = Math.min(frame, FLAME_TOTAL_FRAMES - 1);
    
    // Custom frame mapping for flames only:
    // 0: Top left flame
    // 1: Top right flame
    // 2: Bottom left flame
    // 3: Bottom right flame
    let col = frameIndex % 2;
    let row = Math.floor(frameIndex / 2);

    // Calculate background position based on our mapping
    const backgroundX = -col * FLAME_SPRITE_WIDTH;
    const backgroundY = -row * FLAME_SPRITE_HEIGHT;

    // Total size of the flame sprite sheet (2x2)
    const sheetWidth = FLAME_SPRITE_WIDTH * 2;
    const sheetHeight = FLAME_SPRITE_HEIGHT * 2;

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
