import { h } from '../framework/index.js';

// Movement constants - adjust these to fine-tune movement feel
export const MOVEMENT = {
    BASE_COOLDOWN: 160,        // Higher value = slower base movement (was 140)
    MIN_COOLDOWN: 60,          // Minimum possible cooldown (was 50)
    HOLD_DELAY: 200,           // Keep the same hold delay
    SPEED_FACTOR: 1.0          // Direct mapping of server speed to cooldown (was 1.5)
};

// Render player stats overlay
export function renderPlayerStats(player) {
    if (!player) return null;
    
    // Convert speed to display format with color coding
    let speedDisplay = player.speed ? player.speed.toFixed(1) : '1.0';
    let speedColor = '#ffffff';
    
    if (player.speed && player.speed > 1.0) {
        if (player.speed >= 2.0) {
            speedColor = '#00ff00'; // Green for high speed
        } else if (player.speed >= 1.5) {
            speedColor = '#ffff00'; // Yellow for medium speed
        } else {
            speedColor = '#00ffff'; // Cyan for slight speed boost
        }
    }
    
    return h('div', {
        style: `
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
            z-index: 100;
            box-shadow: 0 0 5px rgba(0,0,0,0.5);
            border: 1px solid #666;
        `
    }, [
        h('div', {}, `Player: ${player.nickname || 'Player ' + player.number}`),
        h('div', {}, [
            'Speed: ',
            h('span', { style: `color: ${speedColor}; font-weight: bold;` }, speedDisplay)
        ]),
        h('div', {}, `Bombs: ${player.maxBombs || 1}`),
        h('div', {}, `Power: ${player.bombPower || 1}`),
        h('div', {}, `Lives: ${player.lives || 3}`)
    ]);
}