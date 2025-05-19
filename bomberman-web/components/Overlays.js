// Overlays for death/game over from index.js
// Shows a message when the player dies
export function showDeathMessage() {
    const existingOverlay = document.getElementById('death-overlay');
    if (existingOverlay) return; // Don't show if already there

    const overlay = document.createElement('div');
    overlay.id = 'death-overlay';
    overlay.className = 'game-overlay'; // Use the same class for styling
    overlay.innerHTML = `
        <div class="game-overlay-content">
            <h2>You Died!</h2>
            <p>Waiting for game to end...</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

// Handles triggering the game restart after a delay
export function handleGameEnd(winner, onRestart) {
    let gameEndOverlay = document.getElementById('game-end-overlay');
    if (gameEndOverlay) {
        gameEndOverlay.remove(); // Remove existing overlay if any
    }

    gameEndOverlay = document.createElement('div');
    gameEndOverlay.id = 'game-end-overlay';
    gameEndOverlay.style.position = 'fixed';
    gameEndOverlay.style.left = '0';
    gameEndOverlay.style.top = '0';
    gameEndOverlay.style.width = '100%';
    gameEndOverlay.style.height = '100%';
    gameEndOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    gameEndOverlay.style.display = 'flex';
    gameEndOverlay.style.flexDirection = 'column';
    gameEndOverlay.style.justifyContent = 'center';
    gameEndOverlay.style.alignItems = 'center';
    gameEndOverlay.style.color = 'white';
    gameEndOverlay.style.zIndex = '1000';

    const title = document.createElement('h1');
    title.textContent = 'Game Finished!';
    gameEndOverlay.appendChild(title);

    const winnerMessage = document.createElement('p');
    if (winner) {
        let displayName;
        // Prioritize nickname, then name (from server), then Name (case-sensitive from server)
        if (winner.nickname && String(winner.nickname).trim() !== "") {
            displayName = String(winner.nickname).trim();
        } else if (winner.name && String(winner.name).trim() !== "") { // Check for 'name'
            displayName = String(winner.name).trim();
        } else if (winner.Name && String(winner.Name).trim() !== "") { // Check for 'Name'
            displayName = String(winner.Name).trim();
        } else {
            // Fallback to ID if no valid name/nickname
            const idName = winner.ID || winner.id;
            if (idName && String(idName).trim() !== "") {
                displayName = `Player ${String(idName).trim()}`;
            } else {
                // Fallback to player number, defaulting to 1 if not available or 0.
                // This aligns with how GameBoard.js determines player number for display.
                const playerNumberFromServer = winner.number || winner.Number;
                displayName = `Player ${playerNumberFromServer || 1}`;
            }
        }
        winnerMessage.textContent = `Winner: ${displayName}`;
    } else {
        winnerMessage.textContent = 'It\'s a draw!';
    }
    winnerMessage.style.fontSize = '24px';
    winnerMessage.style.margin = '20px 0';
    gameEndOverlay.appendChild(winnerMessage);

    const countdownMessage = document.createElement('p');
    countdownMessage.style.fontSize = '20px';
    gameEndOverlay.appendChild(countdownMessage);

    document.body.appendChild(gameEndOverlay);

    let secondsRemaining = 5;
    countdownMessage.textContent = `Returning to lobby in ${secondsRemaining}...`;

    const countdownInterval = setInterval(() => {
        secondsRemaining--;
        if (secondsRemaining > 0) {
            countdownMessage.textContent = `Returning to lobby in ${secondsRemaining}...`;
        } else {
            countdownMessage.textContent = 'Returning to lobby...';
            clearInterval(countdownInterval);
        }
    }, 1000);

    setTimeout(() => {
        if (gameEndOverlay) {
            gameEndOverlay.remove();
        }
        if (typeof onRestart === 'function') {
            onRestart(); // This will call requestGameRestart from index.js
        }
    }, 5000); // Restart after 5 seconds
}
