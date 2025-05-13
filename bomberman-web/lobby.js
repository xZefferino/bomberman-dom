// Lobby UI using mini-framework
import { connectWebSocket } from './ws.js';

let nickname = '';
let playerCount = 1;

function renderLobby(root, { onJoin, onSendChat }) {
    root.innerHTML = `
        <div class="lobby-container">
            <h2>Bomberman Lobby</h2>
            <label>Nickname: <input id="nickname-input" type="text" maxlength="12" autofocus /></label>
            <button id="join-btn">Join Game</button>
            <div id="player-count">Players: ${playerCount}/4</div>
            <div id="lobby-status"></div>
            <div id="chat-area" style="margin-top:16px;max-height:120px;overflow-y:auto;background:#222;padding:8px;border-radius:4px;"></div>
            <input id="chat-input" type="text" placeholder="Type a message..." style="width:70%;" disabled />
            <button id="chat-send" disabled>Send</button>
        </div>
    `;
    document.getElementById('join-btn').onclick = () => {
        nickname = document.getElementById('nickname-input').value.trim();
        if (nickname) {
            onJoin(nickname);
            document.getElementById('lobby-status').textContent = "Waiting for other players...";
            document.getElementById('join-btn').disabled = true;
            document.getElementById('nickname-input').disabled = true;
            document.getElementById('chat-input').disabled = false;
            document.getElementById('chat-send').disabled = false;
        }
    };
    document.getElementById('nickname-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('join-btn').click();
        }
    });
    document.getElementById('chat-send').onclick = () => {
        const msg = document.getElementById('chat-input').value.trim();
        if (msg) {
            onSendChat(msg);
            document.getElementById('chat-input').value = '';
        }
    };
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('chat-send').click();
        }
    });
}

function updatePlayerCount(count) {
    playerCount = count;
    const el = document.getElementById('player-count');
    if (el) el.textContent = `Players: ${playerCount}/4`;
}

function appendChatMessage({ playerName, message, playerNumber }) {
    const chatArea = document.getElementById('chat-area');
    if (chatArea) {
        const div = document.createElement('div');
        let prefix = playerNumber ? `Player ${playerNumber} ` : '';
        let name = playerName || 'Unknown';
        div.textContent = `${prefix}${name}: ${message}`;
        chatArea.appendChild(div);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
}

export { renderLobby, updatePlayerCount, appendChatMessage };
