// Entry point for Bomberman web app
import { renderLobby, updatePlayerCount } from './lobby.js';
import { connectWebSocket } from './ws.js';

const root = document.getElementById('app');

function startLobby() {
    // Ensure the lobby is rendered on page load
    renderLobby(root, {
        onJoin: (nickname) => {
            connectWebSocket(nickname, (data) => {
                if (data.type === 'player_count') {
                    console.log('[WS]', data); // Only log player_count
                    updatePlayerCount(data.count);
                } else if (data.type === 'gameState') {
                    // Ignore gameState messages in the lobby for now
                    return;
                } else {
                    console.log('[WS]', data); // Log other messages for debugging
                }
                // handle other lobby messages
            });
        }
    });
}

// Wait for DOMContentLoaded to ensure #app exists
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLobby);
} else {
    startLobby();
}
