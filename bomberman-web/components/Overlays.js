// Overlays for death/game over from index.js
export function showDeathMessage() {
    // Show a simple overlay for player death
    let overlay = document.getElementById('death-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'death-overlay';
        overlay.style = `
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.7);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            z-index: 9999;
        `;
        overlay.textContent = 'You Died!';
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 2000);
}

export function handleGameEnd(winner) {
    // Show a simple overlay for game end
    let overlay = document.getElementById('gameover-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gameover-overlay';
        overlay.style = `
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.8);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            font-size: 48px;
            z-index: 9999;
        `;
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = winner
        ? `<div>Game Over!<br>Winner: <b>${winner.nickname || 'Player ' + (winner.number || winner.Number || 1)}</b></div>`
        : '<div>Game Over!<br>No winners this time.</div>';
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 3000);
}
