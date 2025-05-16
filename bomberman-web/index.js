import { renderLobby, updatePlayerCount, appendChatMessage } from './lobby.js';
import { connectWebSocket, socket, isJoined } from './ws.js';
import { renderGame } from './game.js';
import { MOVEMENT } from './stats.js';
import { updatePlayerStats, toggleStatsBar, removeStatsBar } from './showStats.js';
// Add this import for death handling
import { handlePlayerDeath, deadPlayers, isPlayerDying, isDeathComplete } from './death.js';

// Add a gameState variable to track if a game is in progress
let gameInProgress = false;

let activeAnimations = {};
let localFrames = {};
let lastPositions = {};
let lastFrameTime = 0;
const FRAME_INTERVAL = 35;

const root = document.getElementById('app');
let currentNickname = '';
let currentPlayerID = '';
let gameState = null;
let inGame = false;

// Track player's alive/dead status
let playerWasAlive = true;

// Move these variables to the top level so they're accessible in all functions
let keysPressed = {};
let keyPressTime = {}; // Track when keys were first pressed
let lastMoveTime = 0;

async function joinGame(nickname) {
    const res = await fetch('http://localhost:8080/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname })
    });
    const data = await res.json();
    if (res.status !== 200) {
        alert(data.error || "Failed to join game");
        return;
    }
    return data.playerID;
}

// When connecting a new player, check game state
function connectPlayer(nickname) {
    if (gameInProgress) {
        console.log("Game in progress, can't join now");
        return false;
    }
    
    // Your existing connection logic here
    currentNickname = nickname;
    joinGame(nickname).then(playerID => {
        currentPlayerID = playerID;
        connectWebSocket(nickname, currentPlayerID, handleWSMessage);
    });
    
    return true;
}

function startLobby() {
    inGame = false;
    renderLobby(root, {
        onJoin: connectPlayer,
        onSendChat: (msg) => {
            if (!isJoined()) return;
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'chat',
                    playerId: currentPlayerID,
                    payload: { message: msg }
                }));
            }
        },
        gameInProgress
    });
}

// When game starts, set gameInProgress
function onGameStart() {
    gameInProgress = true;
    // Update lobby UI
    renderLobby(document.getElementById('lobby-container'), {
        onJoin: connectPlayer,
        onSendChat: (msg) => {
            if (!isJoined()) return;
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'chat',
                    playerId: currentPlayerID,
                    payload: { message: msg }
                }));
            }
        },
        gameInProgress
    });
}

// When game ends, keep gameInProgress = true until reset
function onGameEnd() {
    // Keep gameInProgress = true
    // The Play Again button will reset it
}

// Strengthen the Play Again handler

function handlePlayAgain() {
    console.log("Play Again button clicked");
    
    // First, disable the button to prevent multiple clicks
    const playAgainButtons = document.querySelectorAll('button');
    playAgainButtons.forEach(btn => {
        if (btn.textContent === 'Play Again') {
            btn.disabled = true;
            btn.textContent = 'Resetting...';
        }
    });
    
    // Set game as not in progress
    gameInProgress = false;
    
    // Send a message to the server to restart the game
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'restart_game',
            playerId: currentPlayerID
        }));
        
        console.log("Restart game message sent to server");
    } else {
        console.error("Socket is not open, cannot send restart message");
    }
    
    // Give some time for the server to process the restart
    setTimeout(() => {
        // Clear game state
        gameState = null;
        inGame = false;
        
        // Reset death animations
        Object.keys(deadPlayers).forEach(key => {
            deadPlayers[key].done = true;
        });
        
        // Clear any leftover UI elements
        document.querySelectorAll('.game-over-overlay').forEach(el => el.remove());
        
        // Return to lobby
        console.log("Returning to lobby");
        startLobby();
    }, 500);
}

function handleWSMessage(data) {
    if (data.type === 'player_count') {
        updatePlayerCount(data.count);
    } else if (data.type === 'chat') {
        let payload = data.payload;
        if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch (e) { payload = {}; }
        }
        if (payload && payload.message) appendChatMessage(payload);
    } else if (data.type === 'gameState') {
        if (!inGame && data.state && data.state.state === 0) {
            // State 0 means waiting in lobby - don't start game yet
            console.log("Received lobby state update, staying in lobby");
            // Just update player counts etc. but don't start game
            if (data.state.players) {
                updatePlayerCount(data.state.players.length);
            }
        } else {
            // Game is starting or already in progress
            handleGameStateUpdate(data);
        }
    }
}

// Add this function to handle game ending
function handleGameEnd(winner) {
    // Show game over message with winner
    const gameOverMessage = document.createElement('div');
    gameOverMessage.innerHTML = winner ? 
        `<h2>GAME OVER!</h2><h3>${winner.nickname || 'Player ' + winner.number} WINS!</h3>` :
        '<h2>GAME OVER!</h2><h3>No winners this time!</h3>';
        
    gameOverMessage.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 30px 60px;
        border-radius: 10px;
        font-size: 24px;
        text-align: center;
        z-index: 1000;
        box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
    `;
    
    // Add a restart button
    const restartButton = document.createElement('button');
    restartButton.innerText = 'Back to Lobby';
    restartButton.style = `
        background-color: #e74c3c;
        color: white;
        border: none;
        padding: 10px 20px;
        margin-top: 20px;
        font-size: 18px;
        cursor: pointer;
        border-radius: 5px;
        transition: background-color 0.3s;
    `;
    
    restartButton.addEventListener('mouseover', () => {
        restartButton.style.backgroundColor = '#c0392b';
    });
    
    restartButton.addEventListener('mouseout', () => {
        restartButton.style.backgroundColor = '#e74c3c';
    });
    
    restartButton.addEventListener('click', () => {
        // Remove game over message
        document.body.removeChild(gameOverMessage);
        
        // Return to lobby
        window.location.reload(); // Simplest way to restart
    });
    
    gameOverMessage.appendChild(restartButton);
    document.body.appendChild(gameOverMessage);
}

// Update the game state handling function
function handleGameStateUpdate(newState) {
    console.log("Game state update:", newState);
    
    // Only initialize game UI if this is a proper game state with state >= 1
    // (state 0 = lobby, 1 = countdown, 2 = running, 3 = finished)
    if (!inGame && newState?.state?.state >= 1) {
        console.log("Starting game interface: state = " + newState.state.state);
        initializeGame();
    } else if (!inGame) {
        console.log("Received state update in lobby, not starting game yet");
        return; // Stay in lobby
    }
    
    // Store game state for later use
    gameState = newState;
    
    // Only check for winners if:
    // 1. The game is in active gameplay state (state === 2)
    // 2. There were at least 2 players initially
    // 3. Now only one player remains
    if (newState?.state?.state === 2) { // 2 = GameRunning
        const alivePlayers = (newState?.state?.map?.players || [])
            .filter(p => (p.lives || p.Lives) > 0);
        
        // Only check for winners if there were at least 2 players at some point
        const initialPlayerCount = newState?.state?.initialPlayerCount || 0;
        
        if (alivePlayers.length <= 1 && initialPlayerCount > 1) {
            const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
            console.log("Game has ended! Winner:", winner);
            
            // Only handle game end once
            if (newState.state.state !== 3) { // 3 = GameFinished
                handleGameEnd(winner);
            }
            
            // Mark the game as finished
            newState.state.state = 3; // GameFinished state
        }
    }
    
    // Detect player death (for yourself)
    const playerState = newState?.state?.map?.players?.find(
        p => (p.id || p.ID) === currentPlayerID
    );
    
    const isPlayerAlive = playerState && (playerState.lives || playerState.Lives) > 0;
    
    if (playerWasAlive && !isPlayerAlive) {
        console.log("Player has died!");
        // Show death message to the player
        showDeathMessage();
        
        // Ensure death animation is started
        if (playerState) {
            handlePlayerDeath(
                currentPlayerID, 
                playerState.number || playerState.Number || 1,
                playerState.position || playerState.Position
            );
        }
    }
    
    playerWasAlive = isPlayerAlive;
    
    // Continue with game rendering
    if (inGame) {
        // Fix the updatePlayerStats call to properly handle the players array
        updatePlayersStatsFixed(newState);
        
        const gameRoot = document.getElementById('game-root');
        if (gameRoot) {
            renderGame(gameRoot, gameState, currentPlayerID, handlePlayAgain);
        }
    }
}

// Helper function to safely call updatePlayerStats
function updatePlayersStatsFixed(state) {
    try {
        // Make sure we're passing a valid array of players
        const players = state?.state?.map?.players;
        if (Array.isArray(players)) {
            updatePlayerStats(players, currentPlayerID);
        } else {
            console.warn("Invalid players data:", players);
            updatePlayerStats([], currentPlayerID); // Pass empty array as fallback
        }
    } catch (err) {
        console.error("Error updating player stats:", err);
    }
}

// Add this new function to initialize the game UI
function initializeGame() {
    // Set game as active
    inGame = true;
    
    // Clear the current content
    root.innerHTML = '';
    
    // Create game container
    const gameContainer = document.createElement('div');
    gameContainer.id = 'game-root';
    root.appendChild(gameContainer);
    
    // Initialize player stats UI
    if (gameState?.state?.map?.players) {
        console.log("Initializing player stats with:", gameState.state.map.players);
        updatePlayerStats(gameState.state.map.players, currentPlayerID);
    }
    
    // Start the game loop for animations and controls
    startGameLoop();
    
    console.log("Game interface initialized");
}

function showDeathMessage() {
    // Create a death message overlay that fades out
    const deathMessage = document.createElement('div');
    deathMessage.innerHTML = 'YOU DIED!';
    deathMessage.style = `
        position: fixed;
        top: 30%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: red;
        font-size: 48px;
        font-weight: bold;
        z-index: 1000;
        text-shadow: 2px 2px 8px #000;
        animation: fadeOut 3s forwards;
        pointer-events: none;
    `;
    
    // Add fadeOut animation if it doesn't exist
    if (!document.querySelector('#death-animation-style')) {
        const style = document.createElement('style');
        style.id = 'death-animation-style';
        style.textContent = `
            @keyframes fadeOut {
                0% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); }
                70% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(deathMessage);
    
    // Remove the message after animation completes
    setTimeout(() => {
        if (deathMessage.parentNode) {
            deathMessage.parentNode.removeChild(deathMessage);
        }
    }, 3000);
}

function startGameLoop() {
    function loop(timestamp) {
        if (!inGame) return;

        const gameRoot = document.getElementById('game-root');
        if (gameState && gameRoot) {
            if (!lastFrameTime) lastFrameTime = timestamp;
            const elapsed = timestamp - lastFrameTime;

            // Find current player to get their speed
            let currentPlayer = null;
            let adjustedCooldown = MOVEMENT.BASE_COOLDOWN;
            
            if (currentPlayerID && gameState.state && gameState.state.map && gameState.state.map.players) {
                currentPlayer = gameState.state.map.players.find(p => 
                    (p.id || p.ID) === currentPlayerID
                );
                
                if (currentPlayer && currentPlayer.speed) {
                    // Direct mapping from server speed to cooldown
                    adjustedCooldown = Math.max(
                        MOVEMENT.MIN_COOLDOWN, 
                        MOVEMENT.BASE_COOLDOWN / currentPlayer.speed
                    );
                }
            }

            // Handle continuous movement with speed-adjusted cooldown
            const now = timestamp;
            if (now - lastMoveTime > adjustedCooldown && isJoined() && currentPlayerID) {
                let action = null;
                const keys = ['ArrowUp', 'w', 'ArrowDown', 's', 'ArrowLeft', 'a', 'ArrowRight', 'd'];
                
                // Check which keys are currently held AND have been held long enough
                for (const key of keys) {
                    if (keysPressed[key] && 
                        (keyPressTime[key] === -1 || now - keyPressTime[key] > MOVEMENT.HOLD_DELAY)) {
                        
                        // Once we've passed the hold delay, mark with -1 so we don't check again
                        if (keyPressTime[key] !== -1) {
                            keyPressTime[key] = -1;
                        }
                        
                        if (key === 'ArrowUp' || key === 'w') action = 'move_up';
                        else if (key === 'ArrowDown' || key === 's') action = 'move_down';
                        else if (key === 'ArrowLeft' || key === 'a') action = 'move_left';
                        else if (key === 'ArrowRight' || key === 'd') action = 'move_right';
                        
                        if (action) break; // Only one direction at a time
                    }
                }
                
                if (action) {
                    // Reset the move timer
                    lastMoveTime = now;
                    
                    // Send movement to server
                    sendAction(action);
                }
            }

            const clonedPlayers = gameState.state.map.players.map((p) => {
                const id = p.id || p.ID;
                const key = id;
                const last = lastPositions[key] || {};
                const moved = !last || last.x !== p.position.x || last.y !== p.position.y;

                // Start animation for ANY player that moved, not just the current player
                if (moved) {
                    activeAnimations[key] = activeAnimations[key] || {
                        frameIndex: 0,
                        startTime: timestamp
                    };
                }

                if (!localFrames[key]) localFrames[key] = 0;

                if (activeAnimations[key]) {
                    const anim = activeAnimations[key];
                    const timeSinceStart = timestamp - anim.startTime;
                    const frame = Math.floor(timeSinceStart / FRAME_INTERVAL);

                    if (frame < 9) {
                        localFrames[key] = frame;
                    } else {
                        localFrames[key] = 0;
                        delete activeAnimations[key];
                    }
                }

                lastPositions[key] = { x: p.position.x, y: p.position.y };

                return {
                    ...p,
                    frame: localFrames[key],
                    number: p.number || p.Number || 1  // ✅ PRESERVE number!
                };
            });

            if (elapsed > FRAME_INTERVAL) {
                lastFrameTime = timestamp;
            }

            const localState = {
                ...gameState,
                state: {
                    ...gameState.state,
                    map: {
                        ...gameState.state.map,
                        players: clonedPlayers
                    }
                }
            };

            // Define a proper play again handler that will be passed to renderGame
            const playAgainHandler = () => {
                console.log("Play Again handler called from game loop");
                handlePlayAgain();
            };

            renderGame(gameRoot, localState, currentPlayerID, playAgainHandler);
        }

        requestAnimationFrame(loop);
    }

    // Track keydown and keyup events
    window.onkeydown = (e) => handleKeyInput(e, true);
    window.onkeyup = (e) => handleKeyInput(e, false);

    loop();
}

function handleKeyInput(e, isDown) {
    // Skip input processing if the player is dead
    const playerState = gameState?.state?.map?.players.find(
        p => (p.id || p.ID) === currentPlayerID
    );
    
    // If player can't be found in active players or has no lives, they're dead
    if (!playerState || (playerState.lives <= 0)) {
        console.log("Player is dead, ignoring inputs");
        return; // Skip input processing for dead players
    }
    
    if (!inGame || !isJoined() || !currentPlayerID) return;
    
    // Track this key as pressed with timestamp (only if not already pressed)
    if (isDown && !keysPressed[e.key]) {
        keysPressed[e.key] = true;
        keyPressTime[e.key] = performance.now();
    } else if (!isDown) {
        // Remove this key from pressed keys and reset timing
        delete keysPressed[e.key];
        delete keyPressTime[e.key];
    }
    
    // Prevent default for arrow keys to stop page scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
    
    // For immediate response on first press (don't wait for hold)
    if (isDown && !e.repeat) {
        let action = null;
        if (e.key === 'ArrowUp' || e.key === 'w') action = 'move_up';
        else if (e.key === 'ArrowDown' || e.key === 's') action = 'move_down';
        else if (e.key === 'ArrowLeft' || e.key === 'a') action = 'move_left';
        else if (e.key === 'ArrowRight' || e.key === 'd') action = 'move_right';
        else if (e.key === ' ' || e.key === 'Enter') action = 'place_bomb';
        
        // Handle immediate movement for better responsiveness
        if (action) {
            lastMoveTime = performance.now();
            
            if (action.startsWith('move')) {
                activeAnimations[currentPlayerID] = {
                    frameIndex: 0,
                    startTime: performance.now()
                };
            }
            
            sendAction(action);
        }
    }
}

function sendAction(action) {
    // Check if player is dead before sending actions
    const playerState = gameState?.state?.map?.players.find(
        p => (p.id || p.ID) === currentPlayerID
    );
    
    // If player can't be found in active players or has no lives, they're dead
    if (!playerState || (playerState.lives <= 0)) {
        console.log("Player is dead, not sending actions to server");
        return; // Skip sending actions for dead players
    }
    
    socket.send(JSON.stringify({
        type: 'action',
        playerId: currentPlayerID,
        payload: { playerId: currentPlayerID, action }
    }));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLobby);
} else {
    startLobby();
}
