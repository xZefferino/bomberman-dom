// Lobby UI using mini-framework
import { connectWebSocket } from './main.js';

let nickname = '';
let playerCount = 1;

function renderLobby(root, { onJoin }) {
    root.innerHTML = `
        <div class="lobby-container">
            <h2>Bomberman Lobby</h2>
            <label>Nickname: <input id="nickname-input" type="text" maxlength="12" autofocus /></label>
            <button id="join-btn">Join Game</button>
            <div id="player-count">Players: ${playerCount}/4</div>
        </div>
    `;
    document.getElementById('join-btn').onclick = () => {
        nickname = document.getElementById('nickname-input').value.trim();
        if (nickname) {
            onJoin(nickname);
        }
    };
    document.getElementById('nickname-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('join-btn').click();
        }
    });
}

function updatePlayerCount(count) {
    playerCount = count;
    const el = document.getElementById('player-count');
    if (el) el.textContent = `Players: ${playerCount}/4`;
}

export { renderLobby, updatePlayerCount };
