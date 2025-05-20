// Lobby UI using mini-framework
let nickname = ''; // This will be set by initialNickname
let playerCount = 1;

function renderLobby(root, { initialNickname, onSendChat, gameInProgress }) { // Removed onJoin
    // initialNickname is expected to be set (from localStorage via index.js)
    nickname = initialNickname || 'Player'; // Use provided nickname, fallback if somehow empty

    root.innerHTML = ''; // Clear previous content
    const lobbyEl = document.createElement('div');
    lobbyEl.className = 'lobby-container';
    lobbyEl.innerHTML = `
        <h2>Bomberman Lobby</h2>
        <div style="display: inline-block; margin-bottom: 10px; text-align: left;"> <!-- Added text-align: left here -->
            <label style="display: inline; margin-right: 5px; color: #bbb; font-size: 1em;">Nickname:</label> <!-- Added display: inline; -->
            <span id="nickname-display" style="font-weight: bold; color: #e0e0e0; font-size: 1em;">${nickname}</span>
        </div>
        <div id="player-count">Players: ${playerCount}/4</div>
        <div id="lobby-status">${gameInProgress ? 'Game in progress. Please wait...' : 'Connected to lobby. Waiting for players...'}</div>
        <div id="lobby-countdown" style="margin-top: 10px; font-weight: bold;"></div>
        <div id="chat-area" style="margin-top:16px;max-height:120px;overflow-y:auto;background:#222;padding:8px;border-radius:4px;"></div>
        <input id="chat-input" type="text" placeholder="Type a message..." style="width:70%;" /> <!-- Enabled by default -->
        <button id="chat-send">Send</button> <!-- Enabled by default -->
    `;
    root.appendChild(lobbyEl);

    // Elements are still needed for chat
    const chatInputEl = document.getElementById('chat-input');
    const chatSendEl = document.getElementById('chat-send');

    // Removed event listeners and logic for nicknameInputEl (it's removed) and joinButtonEl (it's removed)

    chatSendEl.onclick = () => {
        const msg = chatInputEl.value.trim();
        if (msg) {
            onSendChat(msg); // onSendChat in index.js will handle WebSocket state
            chatInputEl.value = '';
        }
    };
    chatInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !chatSendEl.disabled) { // Check if button is not disabled
            chatSendEl.click();
        }
    });
}

function updatePlayerCount(count) {
    playerCount = count;
    const el = document.getElementById('player-count');
    if (el) el.textContent = `Players: ${playerCount}/4`;
}

// Modified to handle system messages (like player join announcements)
function appendChatMessage({ playerName, message, playerNumber, isSystem = false }) {
    const chatArea = document.getElementById('chat-area');
    if (chatArea) {
        const div = document.createElement('div');
        if (isSystem) {
            div.textContent = message;
            div.style.fontStyle = 'italic';
            div.style.color = '#aaa'; // Light grey for system messages
        } else {
            let prefix = playerNumber ? `Player ${playerNumber} ` : '';
            let name = playerName || 'Unknown';
            div.textContent = `${prefix}${name}: ${message}`;
        }
        chatArea.appendChild(div);
        chatArea.scrollTop = chatArea.scrollHeight; // Auto-scroll to the latest message
    }
}

function updateLobbyCountdownDisplay(remainingSeconds) {
    const countdownEl = document.getElementById('lobby-countdown');
    if (countdownEl) {
        if (remainingSeconds > 0) {
            countdownEl.textContent = `Lobby closes in ${remainingSeconds}s`;
        } else {
            countdownEl.textContent = 'Lobby closed. Starting game soon...';
        }
    }
}

// Clears only the text content, interval is managed by index.js
function clearLobbyCountdown() {
    const countdownEl = document.getElementById('lobby-countdown');
    if (countdownEl) {
        countdownEl.textContent = '';
    }
}

// Removed lobbyCountdownInterval from export
export { renderLobby, updatePlayerCount, appendChatMessage, updateLobbyCountdownDisplay, clearLobbyCountdown };
