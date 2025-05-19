// Lobby UI using mini-framework
let nickname = ''; // This will be set by initialNickname or input
let playerCount = 1;
let lobbyCountdownInterval = null; // Keep track of the interval

function renderLobby(root, { initialNickname, onJoin, onSendChat, gameInProgress }) { // Added initialNickname
    // If an initialNickname is provided (e.g., from localStorage via index.js), use it.
    // This updates the module-scoped `nickname` which is then used in the template value.
    if (initialNickname) {
        nickname = initialNickname;
    } else {
        // If no initial nickname (e.g. first visit, or localStorage was cleared), ensure module `nickname` is empty
        // so the input field doesn't show a stale value from a previous renderLobby call within the same session.
        nickname = '';
    }

    root.innerHTML = '';
    const lobbyEl = document.createElement('div');
    lobbyEl.className = 'lobby-container';
    lobbyEl.innerHTML = `
        <h2>Bomberman Lobby</h2>
        <label>Nickname: <input id="nickname-input" type="text" maxlength="12" value="${nickname}" autofocus autocomplete="off" /></label>
        <button id="join-btn" ${gameInProgress ? 'disabled' : ''}>Join Game</button>
        <div id="player-count">Players: ${playerCount}/4</div>
        <div id="lobby-status">${gameInProgress ? 'Game in progress. Please wait for the next round.' : 'Ready to join!'}</div>
        <div id="lobby-countdown" style="margin-top: 10px; font-weight: bold;"></div> <!-- New element for countdown -->
        <div id="chat-area" style="margin-top:16px;max-height:120px;overflow-y:auto;background:#222;padding:8px;border-radius:4px;"></div>
        <input id="chat-input" type="text" placeholder="Type a message..." style="width:70%;" disabled />
        <button id="chat-send" disabled>Send</button>
    `;
    root.appendChild(lobbyEl);

    const nicknameInputEl = document.getElementById('nickname-input');
    const joinButtonEl = document.getElementById('join-btn');
    const lobbyStatusEl = document.getElementById('lobby-status');
    const chatInputEl = document.getElementById('chat-input');
    const chatSendEl = document.getElementById('chat-send');

    // If a nickname was restored and used, and we are trying to join (e.g. after refresh),
    // potentially disable input/button until server confirms state.
    // This logic might be better handled based on `isJoined()` status or server messages.
    if (nickname && gameInProgress) { // If prefilled and game is marked in progress
        nicknameInputEl.disabled = true;
        // joinButtonEl.disabled = true; // Join button already handles gameInProgress
        // lobbyStatusEl.textContent = "Attempting to rejoin...";
    }


    joinButtonEl.onclick = () => {
        const currentInputNickname = nicknameInputEl.value.trim();
        if (currentInputNickname) {
            nickname = currentInputNickname; // Update module-scoped nickname
            onJoin(nickname); // onJoin in index.js will handle localStorage
            lobbyStatusEl.textContent = "Waiting for other players...";
            joinButtonEl.disabled = true;
            nicknameInputEl.disabled = true;
            chatInputEl.disabled = false;
            chatSendEl.disabled = false;
        }
    };
    nicknameInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('join-btn').click();
        }
    });
    chatSendEl.onclick = () => {
        const msg = chatInputEl.value.trim();
        if (msg) {
            onSendChat(msg);
            chatInputEl.value = '';
        }
    };
    chatInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            chatSendEl.click();
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

// New function to update lobby countdown display
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

// New function to clear the lobby countdown display and interval
function clearLobbyCountdown() {
    if (lobbyCountdownInterval) {
        clearInterval(lobbyCountdownInterval);
        lobbyCountdownInterval = null;
    }
    const countdownEl = document.getElementById('lobby-countdown');
    if (countdownEl) {
        countdownEl.textContent = '';
    }
}

export { renderLobby, updatePlayerCount, appendChatMessage, updateLobbyCountdownDisplay, clearLobbyCountdown, lobbyCountdownInterval };
