import { renderLobby, updatePlayerCount, appendChatMessage, updateLobbyCountdownDisplay, clearLobbyCountdown } from './components/Lobby.js';
import { removeStatsBar, updatePlayerStats } from './components/PlayerStats.js'; // Ensure this import is correct
import { showDeathMessage, handleGameEnd } from './components/Overlays.js';
import { connectWebSocket, socket, isJoined } from './ws.js';
import { renderGame } from './game.js';

// Add a gameState variable to track if a game is in progress
let gameInProgress = false;

let activeAnimations = {};
let localFrames = {};
let lastPositions = {};
let lastFrameTime = 0;
const FRAME_INTERVAL = 35;
const SPRITE_FRAMES = 9; // Number of frames for player animation

const root = document.getElementById('app');

// Global variables - these will be populated by the logic below
let currentPlayerID = null;
let currentNickname = null;

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
const BOMB_DEBOUNCE = 600; // ms, minimum time between bomb drops
let lastBombTime = 0;

let localPlayerFrame = 0;
let localPlayerLastMove = 0;
let walkFrameIndex = 0; // Added for cycling through walkFrames

let lobbyCountdownEndTime = 0; // Store the server-provided end time
let localLobbyCountdownIntervalId = null; // Interval ID for lobby countdown managed by index.js

async function joinGame(nickname) {
    const res = await fetch('http://localhost:8080/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname })
    });
    const data = await res.json();
    if (res.status !== 200) {
        alert(data.error || "Failed to join game");
        // If join failed because game is in progress or lobby closed, update UI
        if (data.error && (data.error.includes("already started") || data.error.includes("lobby join window has closed") || data.error.includes("lobby is full"))) {
            gameInProgress = true;
            // Re-render lobby to disable join button
            const lobbyContainer = document.getElementById('lobby-container');
            if (lobbyContainer && lobbyContainer.parentElement === root) {
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
        }
        return;
    }
    return data.playerID;
}

// When connecting a new player, check game state
function connectPlayer(nickname) {
    // This client-side check is a quick feedback. Server is the source of truth.
    if (gameInProgress && !currentPlayerID) { // Allow if currentPlayerID exists (attempting re-join)
        console.log("Game in progress or lobby closed, can't join now (client-side check)");
        alert("Game is currently in progress or the lobby is closed. Please wait.");
        // Ensure lobby UI reflects this, potentially by re-rendering with gameInProgress = true
        const lobbyContainer = document.getElementById('lobby-container');
        if (lobbyContainer && lobbyContainer.parentElement === root) {
            renderLobby(root, {
                initialNickname: currentNickname || '', // Use currentNickname if available
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
                gameInProgress: true // Force gameInProgress true here
            });
        }
        return false;
    }
    
    currentNickname = nickname; // Set currentNickname from the input
    joinGame(nickname).then(playerID => {
        if (playerID) {
            currentPlayerID = playerID;
            // Store details in localStorage
            localStorage.setItem('bomberman_currentPlayerID', currentPlayerID);
            localStorage.setItem('bomberman_currentNickname', currentNickname);
            console.log(`Stored session for ${currentNickname} (${currentPlayerID})`);
            connectWebSocket(currentNickname, currentPlayerID, handleWSMessage);
        } else {
            // Handle failed join (e.g., server rejected, playerID not returned)
            // Clear any stored credentials if join fails definitively
            localStorage.removeItem('bomberman_currentPlayerID');
            localStorage.removeItem('bomberman_currentNickname');
            // Potentially re-render lobby or show error
            startLobby(); // This will re-render lobby without prefilled/restored session
        }
    }).catch(error => {
        console.error("Error joining game:", error);
        localStorage.removeItem('bomberman_currentPlayerID');
        localStorage.removeItem('bomberman_currentNickname');
        startLobby();
    });
    
    return true; // Indicates an attempt to join was made
}

// Function to manage and display the lobby countdown
function startLobbyCountdown(endTime) {
    lobbyCountdownEndTime = endTime; // Store the end time from server

    if (localLobbyCountdownIntervalId) {
        clearInterval(localLobbyCountdownIntervalId);
        localLobbyCountdownIntervalId = null;
    }

    function updateDisplay() {
        const now = Date.now();
        const remainingMilliseconds = lobbyCountdownEndTime - now;
        const remainingSeconds = Math.max(0, Math.ceil(remainingMilliseconds / 1000));
        
        updateLobbyCountdownDisplay(remainingSeconds); // Call UI update function from Lobby.js

        if (remainingMilliseconds <= 0) {
            if (localLobbyCountdownIntervalId) {
                clearInterval(localLobbyCountdownIntervalId);
                localLobbyCountdownIntervalId = null;
            }
            // Server will transition state. Client UI updates via gameState messages.
            // Optionally, clear display text if needed, though server state change should handle UI.
            // clearLobbyCountdown(); // Might be redundant if new lobby state re-renders.
        }
    }

    updateDisplay(); // Initial call to display immediately
    localLobbyCountdownIntervalId = setInterval(updateDisplay, 1000);
}

function stopAndClearLobbyCountdown() {
    if (localLobbyCountdownIntervalId) {
        clearInterval(localLobbyCountdownIntervalId);
        localLobbyCountdownIntervalId = null;
    }
    clearLobbyCountdown(); // Call UI clear function from Lobby.js
}


function startLobby() {
    inGame = false;
    stopAndClearLobbyCountdown(); 
    gameInProgress = false; 

    stopGameLoop();
    window.removeEventListener('keydown', onKeyDown, false);
    window.removeEventListener('keyup', onKeyUp, false);

    // currentPlayerID and currentNickname are already populated from localStorage by initializeApp
    if (currentPlayerID && currentNickname) {
        console.log(`[startLobby] Session active for ${currentNickname} (${currentPlayerID}). Connecting to WebSocket.`);
        connectWebSocket(currentNickname, currentPlayerID, handleWSMessage);
    } else {
        console.error("[startLobby] CRITICAL: No playerID or nickname. Redirecting to register.");
        window.location.href = 'register.html';
        return;
    }
    
    console.log('[startLobby] Rendering lobby. gameInProgress is:', gameInProgress, 'inGame is:', inGame, 'Initial Nickname:', currentNickname);

    renderLobby(root, {
        initialNickname: currentNickname, // Pass the restored/current nickname
        onSendChat: (msg) => {
            if (!isJoined()) { // isJoined() is from ws.js
                console.warn("Attempted to send chat message before WebSocket connection was fully established as joined.");
                appendChatMessage({ message: "You are not connected to chat yet. Please wait.", isSystem: true });
                return;
            }
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'chat',
                    playerId: currentPlayerID,
                    payload: { message: msg }
                }));
            }
        },
        gameInProgress // Pass current gameInProgress state (from server updates)
    });
}


// New function to request game restart from the server
function requestGameRestart() {
    console.log("Requesting game restart from server...");
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'restart_game',
            playerId: currentPlayerID // Optional: server might not need playerId for a global restart
        }));
        console.log("Restart game message sent to server");
    } else {
        console.error("Socket is not open, cannot send restart message");
        // Fallback or error handling if socket is closed
        alert("Connection error. Cannot restart game.");
        // Potentially try to re-render lobby in a default state
        gameInProgress = false; // Assume game is over, try to go to lobby
        startLobby();
    }
}

function handleWSMessage(data) {
    if (data.type === 'player_count') {
        updatePlayerCount(data.count);
    } else if (data.type === 'chat_message' || data.type === 'chat') { // Handle both potential chat message types
        let payload = data.payload;
        // Ensure payload is an object, attempting to parse if it's a string
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload);
            } catch (e) {
                console.error("Failed to parse chat payload:", payload, e);
                payload = { message: "Error: Malformed chat message received" }; // Fallback
            }
        }
        // Ensure the payload has the necessary properties before appending
        if (payload && typeof payload.message === 'string') {
            appendChatMessage({
                playerName: payload.playerName || payload.nickname, // Use playerName or nickname
                message: payload.message,
                playerNumber: payload.playerNumber
            });
        } else {
            console.warn("Received chat message with invalid payload:", data);
        }
    } else if (data.type === 'gameState') {
        // Update gameInProgress based on the detailed game state from the server
        if (data.state) {
            const currentServerState = data.state.state; // 0: Waiting, 1: Countdown, 2: Running, 3: Finished, 4: Resetting
            const playersLength = data.state.players ? data.state.players.length : 0;

            if (currentServerState === 0) { // GameWaiting
                gameInProgress = false; 
                // If the lobby is already displayed, re-render it with updated info
                // This ensures player count, status, and gameInProgress flag are current.
                const lobbyContainer = document.getElementById('lobby-container');
                if (lobbyContainer && lobbyContainer.parentElement === root) {
                    if (data.state.players) { // Update player count if available
                        updatePlayerCount(data.state.players.length);
                    }
                    renderLobby(root, {
                        initialNickname: currentNickname || '', // Pass the current nickname
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
                        gameInProgress // Pass the updated gameInProgress
                    });
                }
            } else if (currentServerState === 1 || currentServerState === 2 || currentServerState === 3 || currentServerState === 4) {
                // Countdown, Running, Finished or Resetting
                gameInProgress = true;
            }
        }

        if (!inGame && data.state && data.state.state === 0) { // GameWaiting
            // State 0 means waiting in lobby - don't start game yet
            console.log("Received lobby state update, staying in lobby");
            // Just update player counts etc. but don't start game
            if (data.state.players) {
                updatePlayerCount(data.state.players.length);
            }
            // Re-render lobby with potentially updated gameInProgress state
            const lobbyContainer = document.getElementById('lobby-container');
            if (lobbyContainer && lobbyContainer.parentElement === root) { // Check if lobby is still the current view
                 renderLobby(root, {
                    initialNickname: currentNickname || '', // Pass the current nickname
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
                    gameInProgress // Pass the updated gameInProgress
                });
            }
             // Handle lobby countdown from gameState if applicable
            if (data.state.lobbyJoinEndTime && data.state.lobbyJoinEndTime > 0) {
                startLobbyCountdown(data.state.lobbyJoinEndTime);
            } else {
                stopAndClearLobbyCountdown(); // Clear if no end time or not applicable
            }
        } else {
            // Game is starting or already in progress
            handleGameStateUpdate(data);
            // If the game state is Finished (3), and we are in game, handleGameEnd would have been called.
            // If we receive a GameWaiting (0) state from server after a restart, it will trigger lobby.
            if (data.state && data.state.state === 0 && inGame) { // GameWaiting
                console.log("Received GameWaiting state from server, likely after a restart. Transitioning to lobby.");
                inGame = false; // Mark as not in game
                gameInProgress = false; // Lobby is not "game in progress"
                stopGameLoop(); // Stop existing game loop
                stopAndClearLobbyCountdown(); // Clear lobby countdown
                window.removeEventListener('keydown', onKeyDown, false);
                window.removeEventListener('keyup', onKeyUp, false);
                // Clear any game-end overlays manually if they persist
                const gameEndOverlay = document.getElementById('game-end-overlay');
                if (gameEndOverlay) gameEndOverlay.remove();
                const deathOverlay = document.getElementById('death-overlay');
                if (deathOverlay) deathOverlay.remove();

                startLobby(); // Render the lobby
            }
        }
    } else if (data.type === 'player_joined_lobby') {
        if (data.payload && data.payload.playerName) {
            // Optional: Avoid announcing to self if server sends to all and you want to suppress it
            // if (data.payload.playerId === currentPlayerID) return; 
            appendChatMessage({
                message: `${data.payload.playerName} has joined the lobby.`,
                isSystem: true
            });
        }
    } else if (data.type === 'chat') {
        // ... (existing chat handling)
        // Ensure it uses the new appendChatMessage signature if you modified it there
        appendChatMessage({ 
            playerName: data.payload.playerName, 
            message: data.payload.message, 
            playerNumber: data.payload.playerNumber 
            // isSystem will be false/undefined by default
        });
    // ... (other message types) ...
    }
    // Ensure all other calls to renderLobby in this file are updated:
    // e.g., in handleGameStateUpdate or error handlers, remove the onJoin property.
    // Example:
    // renderLobby(root, { initialNickname: currentNickname || '', onSendChat: (msg) => { /*...*/ }, gameInProgress });
}

// Update the game state handling function
function handleGameStateUpdate(newState) {
    console.log("Game state update:", newState);
    // Update gameInProgress based on the new state
    const oldState = gameState?.state?.state;    const currentServerState = newState?.state?.state;

    if (newState?.state) {
        // Determine gameInProgress based on server state
        if (currentServerState === 0) { // GameWaiting
            gameInProgress = false;
        } else if (currentServerState >= 1 && currentServerState <= 4) { // Countdown, Running, Finished, Resetting
            gameInProgress = true;
        }
    }
    
    if (!inGame && currentServerState >= 1) { // If client thinks it's not in game, but server says game is active (countdown, running, etc.)
        // Check if the current player (restored from localStorage or newly joined) is part of this active game
        const playerFromServerState = newState?.state?.map?.players?.find(p => (p.id || p.ID) === currentPlayerID);
        if (currentPlayerID && playerFromServerState) {
            console.log("Current player (" + currentPlayerID + ") is in the game state. Starting game interface: state = " + newState.state.state);
            initializeGame();
        } else {
            console.log("Received game active state (state=" + (newState?.state?.state) + "), but current player (" + currentPlayerID + ") is not in it or currentPlayerID is not set. Ensuring lobby is rendered.");
            // Force render lobby if player is not a participant of the active game.
            // The renderLobby function clears the root element.
            renderLobby(root, {
                initialNickname: currentNickname || '', // Pass the current nickname
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
                gameInProgress // Pass the updated gameInProgress
            });
            // If lobby is rendered, check if lobby countdown needs to start/continue
            if (newState?.state?.state === 0 && newState.state.lobbyJoinEndTime && newState.state.lobbyJoinEndTime > 0) {
                startLobbyCountdown(newState.state.lobbyJoinEndTime);
            } else if (newState?.state?.state !==0 ){
                 stopAndClearLobbyCountdown();
            }
            return; // Do not proceed with game state processing for this client
        }
    } 
    
    gameState = newState; // Update global gameState AFTER oldState has been captured and used
    
    if (inGame) {
        const playerState = newState?.state?.map?.players?.find(
            p => (p.id || p.ID) === currentPlayerID
        );
        
        const isPlayerAlive = playerState && (playerState.lives || playerState.Lives) > 0;
        
        if (playerWasAlive && !isPlayerAlive) {
            console.log("Player has died!");
            showDeathMessage();
        }
        playerWasAlive = isPlayerAlive;

        // Check for game end condition to call handleGameEnd
        // Call it only once when transitioning from a non-finished state to state 3
        if (currentServerState === 3 && oldState !== 3) {
            const alivePlayers = (newState?.state?.map?.players || [])
                .filter(p => (p.lives || p.Lives) > 0);
            const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
            console.log("Game has officially ended (state 3 detected by client). Winner:", winner);
            handleGameEnd(winner, requestGameRestart); // Pass the actual requestGameRestart function
        }
    }

    // Client-side check for game end (can be a fallback or primary if server doesn't send state 3 reliably for this)
    // This might be redundant if the server reliably transitions to state 3 and the above block catches it.
    if (inGame && currentServerState === 2) { // 2 = GameRunning
        const alivePlayers = (newState?.state?.map?.players || [])
            .filter(p => (p.lives || p.Lives) > 0);
        
        const initialPlayerCount = newState?.state?.initialPlayerCount || (newState?.state?.map?.players?.length || 0); 
        
        if (newState.state.state !== 3 && newState.state.state !== 4) { // Ensure not already finished/resetting
            if (alivePlayers.length <= 1 && initialPlayerCount >= 1) { 
                // This condition might trigger handleGameEnd if server is slow to send state 3.
                // However, the server should be the source of truth for game end.
                // Consider if this client-side detection is still needed.
                // If kept, ensure handleGameEnd is not called multiple times.
                // For now, relying on the `oldState !== 3` check above for the primary call.
                console.log("Client detected game end condition (<=1 alive player in GameRunning state). Server should confirm with state 3.");
            }
        }
    }
    
    // Continue with game rendering
    if (inGame) {
        updatePlayersStatsFixed(newState);
        
        const gameRoot = document.getElementById('game-root');
        if (gameRoot) {
            renderGameWithLocalFrame(gameRoot, gameState, currentPlayerID, localPlayerFrame);
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
    stopAndClearLobbyCountdown(); // Clear lobby countdown when game initializes
    
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
    if (!inGame || !isJoined() || !currentPlayerID || !gameState || !gameState.state || !gameState.state.map || !gameState.state.map.players) return;
    const now = performance.now();

    const selfPlayer = gameState.state.map.players.find(p => (p.id || p.ID) === currentPlayerID);
    if (!selfPlayer) return;

    // Use player's speed from gameState, default to 1.0 if not defined
    const playerSpeed = selfPlayer.speed || 1.0;
    // Adjust movement interval based on speed. Higher speed = lower interval.
    // MOVEMENT.BASE_COOLDOWN could be a constant like 160ms for speed 1.0
    // MOVEMENT.SPEED_FACTOR could be 1.0 or adjusted as needed.
    const currentMoveDebounce = MOVE_DEBOUNCE / playerSpeed; // Faster speed allows more frequent messages
    const currentFrameInterval = FRAME_INTERVAL / playerSpeed; // Faster speed animates quicker

    let moveAction = null;
    if (keysPressed['ArrowUp'] || keysPressed['w']) moveAction = 'move_up';
    else if (keysPressed['ArrowDown'] || keysPressed['s']) moveAction = 'move_down';
    else if (keysPressed['ArrowLeft'] || keysPressed['a']) moveAction = 'move_left';
    else if (keysPressed['ArrowRight'] || keysPressed['d']) moveAction = 'move_right';

    if (moveAction) {
        // Animate local player frame for smoothness
        if (now - localPlayerLastMove > currentFrameInterval) {
            walkFrameIndex = (walkFrameIndex + 1) % SPRITE_FRAMES;
            localPlayerFrame = walkFrameIndex;
            localPlayerLastMove = now;
        }

        // Send movement action to server, debounced by player speed
        if (lastMoveDirection !== moveAction || now - lastMoveSent > currentMoveDebounce) {
            sendAction(moveAction);
            lastMoveDirection = moveAction;
            lastMoveSent = now;
        }
    } else {
        lastMoveDirection = null;
        localPlayerFrame = 0; // Idle frame
        walkFrameIndex = 0; // Reset walk animation index when idle
    }
}

function renderGameWithLocalFrame(root, gameState, selfId, localPlayerFrame) {
    // Corrected argument order: localPlayerFrame is the 4th argument, onPlayAgainCallback is the 5th.
    // Pass requestGameRestart so the "Play Again" button in GameBoard can use it.
    renderGame(root, gameState, selfId, localPlayerFrame, requestGameRestart);
}

function onKeyDown(e) {
    handleKeyInput(e, true);
}

function onKeyUp(e) {
    handleKeyInput(e, false);
}

// Define handleKeyInput function
function handleKeyInput(e, isDown) {
    // Skip input processing if the player is dead
    const playerState = gameState?.state?.map?.players.find(
        p => (p.id || p.ID) === currentPlayerID
    );

    // Also skip input if game is in countdown state (state 1)
    if (gameState?.state?.state === 1) { // 1 = GameCountdown
        console.log("Game in countdown, ignoring inputs");
        // Still prevent default for game keys to avoid browser actions
        if ([
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'w', 'a', 's', 'd', ' ', 'Enter'
        ].includes(e.key)) {
            e.preventDefault();
        }
        return;
    }
    
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

// Ensure this main logic runs after the script is parsed, preferably on DOMContentLoaded
function initializeApp() {
    currentPlayerID = localStorage.getItem('bomberman_currentPlayerID');
    currentNickname = localStorage.getItem('bomberman_currentNickname');

    const onRegisterPage = window.location.pathname.endsWith('register.html');

    if (!currentPlayerID && !onRegisterPage) {
        // No player ID and not on registration page, redirect to register
        window.location.href = 'register.html';
        return; // Stop further execution of index.js for this path
    }

    if (onRegisterPage) {
        // If somehow index.js is loaded on register.html, do nothing here.
        // register.js handles that page.
        return;
    }

    // If we reach here, it means we are on index.html and should have a currentPlayerID
    // (or this is an unexpected state if ID is missing).
    if (!currentPlayerID) {
        // This case should ideally not be hit if the redirect above works.
        // As a fallback, redirect again.
        console.warn("PlayerID missing on index.html, redirecting to register.html as a fallback.");
        window.location.href = 'register.html';
        return;
    }
    
    // Proceed with lobby/game initialization on index.html
    startLobby();
    // ... any other initializations for index.html ...
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
