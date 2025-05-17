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
        // If we are in an update cycle for an existing dead player,
        // and position becomes invalid, we might want to mark as done or log error.
        if (deadPlayers[playerId]) {
            deadPlayers[playerId].done = true; // Or handle error more gracefully
            console.error(`🔴 DEATH: Player ${playerId} had invalid position during update. Animation marked done.`);
        }
        return true; // Indicate done or error
    }
    
    if (!deadPlayers[playerId]) {
        // Initialize death state for this player with explicit logging
        console.log(`🔴 DEATH: Player ${playerId} (Number: ${playerNumber}) starting death animation at position:`, position);
        deadPlayers[playerId] = {
            startTime: now,
            frame: 0,
            done: false,
            position: { x: position.x, y: position.y },
            playerNumber, // Store playerNumber
            _lastFrame: -1 // Initialize _lastFrame for debug logging
        };
        
        // Safety timeout (existing logic)
        setTimeout(() => {
            if (deadPlayers[playerId] && !deadPlayers[playerId].done) {
                console.log("Force completing death animation for player", playerId);
                deadPlayers[playerId].done = true;
            }
        }, (DEATH_TOTAL_FRAMES * DEATH_FRAME_DURATION) + 2000);
        
        return false; // Animation started, not complete
    }
    
    const deathState = deadPlayers[playerId];
    
    if (deathState.done) {
        return true; // Already done
    }
    
    const elapsed = now - deathState.startTime;
    const currentFrame = Math.floor(elapsed / DEATH_FRAME_DURATION);
    
    deathState.frame = Math.min(currentFrame, DEATH_TOTAL_FRAMES - 1);
    
    if (deathState._lastFrame !== deathState.frame) {
        // console.log(`🔄 DEATH: Player ${playerId} death animation frame: ${deathState.frame}`);
        deathState._lastFrame = deathState.frame;
    }
    
    if (currentFrame >= DEATH_TOTAL_FRAMES) {
        if (elapsed >= DEATH_FRAME_DURATION * DEATH_TOTAL_FRAMES + 600) { // 600ms for fadeOut
            deathState.done = true;
            console.log(`✅ DEATH: Player ${playerId} death animation complete`);
            return true;
        }
    }
    
    return false; // Animation ongoing
}

// Renamed from the previous version I added, and modified to accept current server players
export function updateDeadPlayerAnimations(currentPlayersFromServer) {
    // 1. Identify and initiate animations for newly dead players
    if (Array.isArray(currentPlayersFromServer)) {
        currentPlayersFromServer.forEach(player => {
            const lives = player.lives || player.Lives || 0;
            const playerId = player.id || player.ID;
            // Ensure playerNumber and position are valid before calling handlePlayerDeath
            const playerNumber = player.number || player.Number || 0; // Default if undefined
            const position = player.position || player.Position;

            if (lives <= 0 && playerId && position) { // Ensure playerId and position are valid
                // If player is dead, ensure their death animation is initiated or ongoing.
                // handlePlayerDeath will add them to deadPlayers if they aren't there
                // or update them if they are. We call it if not already marked 'done'.
                if (!deadPlayers[playerId] || !deadPlayers[playerId].done) {
                    handlePlayerDeath(playerId, playerNumber, position);
                }
            }
        });
    }

    // 2. Update frames for all players currently in the death animation process
    //    (handlePlayerDeath also handles this update if called on an existing player)
    for (const playerId in deadPlayers) {
        if (deadPlayers.hasOwnProperty(playerId)) {
            const playerState = deadPlayers[playerId];
            if (!playerState.done) {
                // This will update the frame and check if done.
                // Position and playerNumber are already stored in playerState.
                handlePlayerDeath(playerId, playerState.playerNumber, playerState.position);
            }
        }
    }
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