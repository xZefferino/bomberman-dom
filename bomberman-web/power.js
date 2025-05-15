export const POWER_UP_IMAGES = {
    speed: './aseets/sprites/speedpower.png',
    bomb: './aseets/sprites/bombpower.png',
    flame: './aseets/sprites/flamepower.png',
};

export function renderPowerUpSprite({ type }) {
    return {
        tag: 'img',
        attrs: {
            src: POWER_UP_IMAGES[type] || POWER_UP_IMAGES.flame,
            style: `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 30px;
            height: 30px;
            object-fit: contain;
            pointer-events: none;
            user-select: none;
        `
        }
    };
}
