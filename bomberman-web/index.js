import { renderLobby, updatePlayerCount, appendChatMessage } from './lobby.js';
import { connectWebSocket, socket, isJoined } from './ws.js';
import { renderGame } from './game.js';

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

            startGameLoop();
        }
    }
}

function startGameLoop() {
    function loop(timestamp) {
        if (!inGame) return;

        const gameRoot = document.getElementById('game-root');
        if (gameState && gameRoot) {
            if (!lastFrameTime) lastFrameTime = timestamp;
            const elapsed = timestamp - lastFrameTime;

            const clonedPlayers = gameState.state.map.players.map((p) => {
                const id = p.id || p.ID;
                const key = id;
                const last = lastPositions[key] || {};
                const moved = !last || last.x !== p.position.x || last.y !== p.position.y;

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

    // 🔁 TAP-ONLY MOVEMENT
    window.onkeydown = (e) => {
        if (e.repeat || !inGame || !isJoined() || !currentPlayerID) return;

        let action = null;
        if (e.key === 'ArrowUp' || e.key === 'w') action = 'move_up';
        else if (e.key === 'ArrowDown' || e.key === 's') action = 'move_down';
        else if (e.key === 'ArrowLeft' || e.key === 'a') action = 'move_left';
        else if (e.key === 'ArrowRight' || e.key === 'd') action = 'move_right';
        else if (e.key === ' ' || e.key === 'Enter') action = 'place_bomb';

        // ✅ Trigger full animation cycle for movement keys
        if (action && action.startsWith('move')) {
            activeAnimations[currentPlayerID] = {
                frameIndex: 0,
                startTime: performance.now()
            };
        }

        if (action) {
            socket.send(JSON.stringify({
                type: 'action',
                playerId: currentPlayerID,
                payload: { playerId: currentPlayerID, action }
            }));
            e.preventDefault();
        }
    };

    loop();
}


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLobby);
} else {
    startLobby();
}
