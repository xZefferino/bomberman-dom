// Entry point for Bomberman web app
import { renderLobby, updatePlayerCount, appendChatMessage } from './lobby.js';
import { connectWebSocket, socket, isJoined } from './ws.js';  // ✅ import isJoined


const root = document.getElementById('app');
let currentNickname = '';
let currentPlayerID = '';
let hasJoined = false;

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
    // Ensure the lobby is rendered on page load
    renderLobby(root, {
        onJoin: async (nickname) => {
            currentNickname = nickname;
            currentPlayerID = await joinGame(nickname); // Get playerID from backend
            connectWebSocket(nickname, currentPlayerID, (data) => {
                if (data.type === 'player_count') {
                    updatePlayerCount(data.count);
                } else if (data.type === 'chat') {
                    let payload = data.payload;
                    // Always try to parse if it's a string
                    if (typeof payload === 'string') {
                        try { payload = JSON.parse(payload); } catch (e) { payload = {}; }
                    }
                    // Only append if message exists
                    if (payload && payload.message) {
                        appendChatMessage(payload);
                    }
                } else if (data.type === 'gameState') {
                    return;
                } else {
                    console.log('[WS]', data);
                }
            });
        },
     onSendChat: (msg) => {
            if (!isJoined()) {  // ✅ use function instead of variable
                console.warn("Cannot send chat before join_ack.");
                return;
            }
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

// Wait for DOMContentLoaded to ensure #app exists
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLobby);
} else {
    startLobby();
}
