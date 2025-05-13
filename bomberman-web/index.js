// Entry point for Bomberman web app
import { renderLobby, updatePlayerCount } from './lobby.js';
import { connectWebSocket } from './main.js';

const root = document.getElementById('app');

function startLobby() {
    // Ensure the lobby is rendered on page load
    renderLobby(root, {
        onJoin: (nickname) => {
            connectWebSocket(nickname, (data) => {
                if (data.type === 'player_count') {
                    updatePlayerCount(data.count);
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
