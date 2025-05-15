export const DEATH_WIDTH = 64;
export const DEATH_HEIGHT = 96;
export const DEATH_TOTAL_FRAMES = 8;
export const DEATH_FRAME_DURATION = 150; // ms per frame

const deathStyle = document.createElement('style');
deathStyle.textContent = `
    @keyframes deathFadeOut {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.2); }
        100% { opacity: 0; transform: scale(0.5); }
    }
`;
document.head.appendChild(deathStyle);

/**
 * Render a player death animation
 * @param {Object} options - Configuration options
 * @param {string} options.imageUrl - URL to death sprite image
 * @param {number} options.playerNumber - Player number (1-4) for coloring
 * @param {number} options.frame - Current animation frame
 * @returns {Object} The rendered death sprite object
 */
export function renderDeathSprite({ imageUrl, playerNumber = 1, frame = 0 }) {
    const frameIndex = Math.min(frame, DEATH_TOTAL_FRAMES - 1);
    
    // Calculate the position in the sprite sheet
    const backgroundX = -frameIndex * DEATH_WIDTH;
    const backgroundY = -(playerNumber - 1) * DEATH_HEIGHT;
    
    const sheetWidth = DEATH_WIDTH * DEATH_TOTAL_FRAMES;
    const sheetHeight = DEATH_HEIGHT * 4; // 4 players
    
    const isLastFrame = frameIndex === DEATH_TOTAL_FRAMES - 1;
    
    return {
        tag: 'div',
        attrs: {
            style: `
                width: ${DEATH_WIDTH}px;
                height: ${DEATH_HEIGHT}px;
                background: url(${imageUrl}) no-repeat;
                background-position: ${backgroundX}px ${backgroundY}px;
                background-size: ${sheetWidth}px ${sheetHeight}px;
                image-rendering: pixelated;
                animation: ${isLastFrame ? 'deathFadeOut 0.6s forwards' : 'none'};
                transform-origin: center;
                z-index: 15; /* Above other game elements */
            `
        }
    };
}

/**
 * Track player death states
 * @type {Object<string, {startTime: number, frame: number, done: boolean}>}
 */
export const deadPlayers = {};

/**
 * Handle player death
 * @param {string} playerId - Player ID
 * @param {number} playerNumber - Player sprite number (1-4)
 * @param {Object} position - Player position {x, y}
 * @returns {boolean} - Whether the death animation is complete
 */
export function handlePlayerDeath(playerId, playerNumber, position) {
    const now = Date.now();
    
    if (!deadPlayers[playerId]) {
        // Initialize death state for this player
        deadPlayers[playerId] = {
            startTime: now,
            frame: 0,
            done: false,
            position: { ...position },
            playerNumber
        };
        return false;
    }
    
    const deathState = deadPlayers[playerId];
    
    // Calculate current frame based on time elapsed
    const elapsed = now - deathState.startTime;
    const currentFrame = Math.floor(elapsed / DEATH_FRAME_DURATION);
    
    // Update the frame
    deathState.frame = currentFrame;
    
    // Check if animation is complete
    if (currentFrame >= DEATH_TOTAL_FRAMES) {
        deathState.done = true;
        return true;
    }
    
    return false;
}

/**
 * Check if a player is currently dying (showing death animation)
 * @param {string} playerId - Player ID
 * @returns {boolean} - Whether player is in death animation
 */
export function isPlayerDying(playerId) {
    return !!deadPlayers[playerId] && !deadPlayers[playerId].done;
}

/**
 * Check if a player's death animation is complete
 * @param {string} playerId - Player ID
 * @returns {boolean} - Whether death animation is complete
 */
export function isDeathComplete(playerId) {
    return !!deadPlayers[playerId] && deadPlayers[playerId].done;
}

/**
 * Remove a player from the death tracking system
 * @param {string} playerId - Player ID
 */
export function removeDeadPlayer(playerId) {
    delete deadPlayers[playerId];
}