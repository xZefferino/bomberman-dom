import { renderLobby, updatePlayerCount, appendChatMessage } from './components/Lobby.js';
import { updatePlayerStats } from './components/PlayerStats.js';
import { showDeathMessage, handleGameEnd } from './components/Overlays.js';
import { connectWebSocket, socket, isJoined } from './ws.js';
import { renderGame } from './game.js';
import { MOVEMENT } from './stats.js';

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

let movementInterval = null;
let lastMoveDirection = null;
let lastMoveSent = 0;
const MOVE_REPEAT_INTERVAL = 60; // ms, lower = smoother
const MOVE_DEBOUNCE = 80; // ms, minimum time between move actions
const BOMB_DEBOUNCE = 200; // ms, minimum time between bomb drops
let lastBombTime = 0;

let localPlayerFrame = 0;
let localPlayerLastMove = 0;

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
    stopGameLoop();
    window.removeEventListener('keydown', onKeyDown, false);
    window.removeEventListener('keyup', onKeyUp, false);
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
    }
    
    playerWasAlive = isPlayerAlive;
    
    // Continue with game rendering
    if (inGame) {
        // Fix the updatePlayerStats call to properly handle the players array
        updatePlayersStatsFixed(newState);
        
        const gameRoot = document.getElementById('game-root');
        if (gameRoot) {
            renderGameWithLocalFrame(gameRoot, gameState, currentPlayerID, handlePlayAgain);
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
    
    // Add keyboard event listeners for gameplay
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);
    
    // Start the game loop for animations and controls
    startGameLoop();
    
    console.log("Game interface initialized");
}

function startGameLoop() {
    if (movementInterval) clearInterval(movementInterval);
    movementInterval = setInterval(handleHeldMovement, MOVE_REPEAT_INTERVAL);
}

function stopGameLoop() {
    if (movementInterval) clearInterval(movementInterval);
    movementInterval = null;
}

function handleHeldMovement() {
    if (!inGame || !isJoined() || !currentPlayerID) return;
    const now = performance.now();
    let moveAction = null;
    if (keysPressed['ArrowUp'] || keysPressed['w']) moveAction = 'move_up';
    else if (keysPressed['ArrowDown'] || keysPressed['s']) moveAction = 'move_down';
    else if (keysPressed['ArrowLeft'] || keysPressed['a']) moveAction = 'move_left';
    else if (keysPressed['ArrowRight'] || keysPressed['d']) moveAction = 'move_right';
    if (moveAction) {
        // Animate local player frame for smoothness
        if (now - localPlayerLastMove > 80) { // 80ms per frame
            localPlayerFrame = (localPlayerFrame + 1) % 9;
            localPlayerLastMove = now;
        }
        if (lastMoveDirection !== moveAction || now - lastMoveSent > MOVE_DEBOUNCE) {
            sendAction(moveAction);
            lastMoveDirection = moveAction;
            lastMoveSent = now;
        }
    } else {
        lastMoveDirection = null;
        localPlayerFrame = 0; // Reset to standing frame
    }
}

function renderGameWithLocalFrame(root, gameState, selfId, onPlayAgain) {
    renderGame(root, gameState, selfId, onPlayAgain, localPlayerFrame);
}

function onKeyDown(e) {
    handleKeyInput(e, true);
}

function onKeyUp(e) {
    handleKeyInput(e, false);
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
    
    // Track this key as pressed
    if (isDown) {
        keysPressed[e.key] = true;
        keyPressTime[e.key] = performance.now();
        // Bomb placement (space or enter)
        if ((e.key === ' ' || e.key === 'Enter') && isDown) {
            const now = performance.now();
            if (now - lastBombTime > BOMB_DEBOUNCE) {
                sendAction('place_bomb');
                lastBombTime = now;
            }
        }
    } else {
        delete keysPressed[e.key];
        delete keyPressTime[e.key];
    }
    
    // Prevent default for movement/bomb keys
    if ([
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'w', 'a', 's', 'd', ' ', 'Enter'
    ].includes(e.key)) {
        e.preventDefault();
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
