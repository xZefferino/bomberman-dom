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
export function handleGameEnd(winner, requestGameRestartCallback) {
    // Remove death overlay if it exists
    const deathOverlay = document.getElementById('death-overlay');
    if (deathOverlay) {
        deathOverlay.remove();
    }

    // The visual "Game Over", winner display, and "Restarting in..." message
    // are handled by the GameUI component.
    // This function is now primarily responsible for triggering the restart logic after the 5s delay.
    console.log(`handleGameEnd (Overlays.js): Game has ended. Winner: ${winner ? winner.nickname : 'No one'}. Triggering restart in 5 seconds.`);

    let countdown = 5;
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            if (requestGameRestartCallback) {
                requestGameRestartCallback();
            }
        }
    }, 1000);
}
