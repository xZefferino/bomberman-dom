import { renderLobby, updatePlayerCount, appendChatMessage } from './lobby.js';
import { connectWebSocket, socket, isJoined } from './ws.js';
import { renderGame } from './game.js';
import { MOVEMENT } from './stats.js';
import { updatePlayerStats, toggleStatsBar, removeStatsBar } from './showStats.js';

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

function startLobby() {
    inGame = false;
    renderLobby(root, {
        onJoin: async (nickname) => {
            currentNickname = nickname;
            currentPlayerID = await joinGame(nickname);
            connectWebSocket(nickname, currentPlayerID, handleWSMessage);
        },
        onSendChat: (msg) => {
            if (!isJoined()) return;
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'chat',
                    playerId: currentPlayerID,
                    payload: { message: msg }
                }));
            }
        }
    });
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
        gameState = data;

        if (!inGame && data.state && (data.state.state === 2 || data.state.state === 1)) {
            inGame = true;

            const lobbyEl = document.getElementById('app');
            if (lobbyEl) lobbyEl.innerHTML = '';

            let gameRoot = document.getElementById('game-root');
            if (!gameRoot) {
                gameRoot = document.createElement('div');
                gameRoot.id = 'game-root';
                document.body.appendChild(gameRoot);
            }

            gameRoot.style.display = 'block';
            
            // Show stats bar when game starts
            toggleStatsBar(true);
            
            startGameLoop();
        } 
        
        // Whether game just started or is in progress, update stats
        if (data.state && data.state.map && data.state.map.players) {
            updatePlayerStats(data.state.map.players, currentPlayerID);
        }
        
        if (inGame && data.state && data.state.state === 3) {
            // Game ended - hide stats
            inGame = false;
            removeStatsBar();
        }
    }
}

function startGameLoop() {
    // Track which keys are currently pressed
    const keysPressed = {};
    const keyPressTime = {}; // Track when keys were first pressed
    let lastMoveTime = 0;
    
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
                    socket.send(JSON.stringify({
                        type: 'action',
                        playerId: currentPlayerID,
                        payload: { playerId: currentPlayerID, action }
                    }));
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

        console.log("🧩 DEBUG Player Sprites:");
        clonedPlayers.forEach(p => {
        console.log(`Player ${p.nickname || p.id} => Number: ${p.number} | Sprite: character${p.number}.png | Pos: (${p.position.x}, ${p.position.y})`);
        });
            renderGame(gameRoot, localState, currentPlayerID);
        }

        requestAnimationFrame(loop);
    }

    // Track keydown and keyup events
    window.onkeydown = (e) => {
        if (!inGame || !isJoined() || !currentPlayerID) return;
        
        // Track this key as pressed with timestamp (only if not already pressed)
        if (!keysPressed[e.key]) {
            keysPressed[e.key] = true;
            keyPressTime[e.key] = performance.now();
        }
        
        // Prevent default for arrow keys to stop page scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
        
        // For immediate response on first press (don't wait for hold)
        if (e.repeat) return;
        
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
            
            socket.send(JSON.stringify({
                type: 'action',
                playerId: currentPlayerID,
                payload: { playerId: currentPlayerID, action }
            }));
        }
    };
    
    window.onkeyup = (e) => {
        // Remove this key from pressed keys and reset timing
        delete keysPressed[e.key];
        delete keyPressTime[e.key];
    };

    loop();
}


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLobby);
} else {
    startLobby();
}
