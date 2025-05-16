export const DEATH_WIDTH = 64;
export const DEATH_HEIGHT = 96;
// Update to match your sprite sheet's 5 frames
export const DEATH_TOTAL_FRAMES = 5;
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

export function renderDeathSprite({ imageUrl, playerNumber = 1, frame = 0 }) {
    const frameIndex = Math.min(frame, DEATH_TOTAL_FRAMES - 1);
    
    // Calculate the position in the sprite sheet - for horizontal frames only
    const backgroundX = -frameIndex * DEATH_WIDTH;
    // Since your sprite doesn't have different player colors, we can remove the vertical offset
    // const backgroundY = -(playerNumber - 1) * DEATH_HEIGHT;
    const backgroundY = 0;
    
    const sheetWidth = DEATH_WIDTH * DEATH_TOTAL_FRAMES;
    const sheetHeight = DEATH_HEIGHT; // Single row for all players
    
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


export const deadPlayers = {};

// Add this function to help with debugging death events
export function debugDeathState() {
    console.log("Current death states:", deadPlayers);
    return Object.keys(deadPlayers).length;
}

// Make the death animation more resilient
export function handlePlayerDeath(playerId, playerNumber, position) {
    const now = Date.now();
    
    // Make sure position is valid to prevent rendering errors
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        console.error(`Invalid position for player ${playerId}:`, position);
        return false;
    }
    
    if (!deadPlayers[playerId]) {
        // Initialize death state for this player with explicit logging
        console.log(`🔴 DEATH: Player ${playerId} starting death animation at position:`, position);
        deadPlayers[playerId] = {
            startTime: now,
            frame: 0,
            done: false,
            position: { x: position.x, y: position.y },
            playerNumber
        };
        
        // Add a cleanup timeout to ensure the death state gets cleaned up
        // even if something goes wrong with the animation
        setTimeout(() => {
            if (deadPlayers[playerId] && !deadPlayers[playerId].done) {
                console.log("Force completing death animation for player", playerId);
                deadPlayers[playerId].done = true;
            }
        }, (DEATH_TOTAL_FRAMES * DEATH_FRAME_DURATION) + 2000); // Safety timeout
        
        return false;
    }
    
    const deathState = deadPlayers[playerId];
    
    // If the animation is already complete, don't update it
    if (deathState.done) {
        return true;
    }
    
    // Calculate current frame based on time elapsed
    const elapsed = now - deathState.startTime;
    const currentFrame = Math.floor(elapsed / DEATH_FRAME_DURATION);
    
    // Update the frame with limits
    deathState.frame = Math.min(currentFrame, DEATH_TOTAL_FRAMES - 1);
    
    // Debug log for frame changes
    if (deathState._lastFrame !== deathState.frame) {
        console.log(`🔄 DEATH: Player ${playerId} death animation frame: ${deathState.frame}`);
        deathState._lastFrame = deathState.frame;
    }
    
    // Check if animation is complete
    if (currentFrame >= DEATH_TOTAL_FRAMES) {
        // Wait additional time for fade out animation
        if (elapsed >= DEATH_FRAME_DURATION * DEATH_TOTAL_FRAMES + 600) {
            deathState.done = true;
            console.log(`✅ DEATH: Player ${playerId} death animation complete`);
            return true;
        }
    }
    
    return false;
}

export function isPlayerDying(playerId) {
    return !!deadPlayers[playerId] && !deadPlayers[playerId].done;
}


export function isDeathComplete(playerId) {
    return !!deadPlayers[playerId] && deadPlayers[playerId].done;
}

export function removeDeadPlayer(playerId) {
    delete deadPlayers[playerId];
}