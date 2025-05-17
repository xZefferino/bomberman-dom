export const FLAME_WIDTH = 48;
export const FLAME_HEIGHT = 48;

export const FLAME_SPRITE_WIDTH = 40;
export const FLAME_SPRITE_HEIGHT = 40;
export const FLAME_TOTAL_FRAMES = 4;
export const FLAME_COLUMNS = 2;
export const FLAME_ROWS = 2;

const flameStyle = document.createElement('style');
flameStyle.textContent = `
    @keyframes flameExpand {
        0% {
            transform: scale(0.6);
            opacity: 0;
        }
        20% {
            transform: scale(1.1);
            opacity: 1;
        }
        40% {
            transform: scale(1);
            opacity: 1;
        }
        100% {
            transform: scale(1);
            opacity: 0;
        }
    }
`;
document.head.appendChild(flameStyle);

export function renderFlameSprite({ imageUrl, type = 'center', power = 1, frame = 0, elapsedTime = 0}) {
    if (frame >= FLAME_TOTAL_FRAMES || elapsedTime > 750) {
        return {
            tag: 'div',
            attrs: {
                style: `
                    width: ${FLAME_WIDTH}px;
                    height: ${FLAME_HEIGHT}px;
                    opacity: 0;
                `
            }
        };
    }

    // Ensure frame is within bounds
    const frameIndex = Math.min(Math.abs(frame % FLAME_TOTAL_FRAMES), FLAME_TOTAL_FRAMES - 1);
    
    let col = frameIndex % FLAME_COLUMNS;
    let row = Math.floor(frameIndex / FLAME_COLUMNS);

    const backgroundX = -col * FLAME_SPRITE_WIDTH;
    const backgroundY = -row * FLAME_SPRITE_HEIGHT;
    const sheetWidth = FLAME_SPRITE_WIDTH * FLAME_COLUMNS;
    const sheetHeight = FLAME_SPRITE_HEIGHT * FLAME_ROWS;

    // Calculate rotation based on type
    let rotation = '0deg';
    if (type === 'vertical') {
        rotation = '90deg';
    } else if (type === 'horizontal') {
        rotation = '0deg';
    }

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
                animation: flameExpand 0.75s ease-out forwards;
                transform-origin: center;
                transform: rotate(${rotation});
                pointer-events: none;
                will-change: transform, opacity;
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
