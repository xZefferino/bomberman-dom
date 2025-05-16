import { h, render } from '../framework/index.js';

// DOM element ID for stats bar
const STATS_CONTAINER_ID = 'player-stats-bar';

// Create and inject the stats container into DOM if it doesn't exist
function ensureStatsContainer() {
    if (!document.getElementById(STATS_CONTAINER_ID)) {
        const statsBar = document.createElement('div');
        statsBar.id = STATS_CONTAINER_ID;
        statsBar.style = `
            position: fixed;
            top: 30%;
            transform: translateY(-50%);
            left: 10px;
            z-index: 1000;
            display: flex;
            flex-direction: column; /* Changed from row to column */
            gap: 10px;
            font-family: 'Arial', sans-serif;
        `;
        document.body.appendChild(statsBar);
    }
    return document.getElementById(STATS_CONTAINER_ID);
}

// Create the player card component
function PlayerCard(player, isCurrentPlayer = false) {
    const number = player.number || player.Number || 1;
    
    // Color the borders based on player number
    const playerColors = [
        '#ff3333', // Player 1 - Red
        '#33cc33', // Player 2 - Blue '#3366ff'
        '#ffcc00', // Player 3 - Green '#33cc33'
        '#3366ff'  // Player 4 - Yellow '#ffcc00'
    ];
    
    const borderColor = playerColors[(number - 1) % playerColors.length];
    
    // Speed indicator
    let speedText = player.speed ? player.speed.toFixed(1) : '1.0';
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
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid ${borderColor};
            border-radius: 4px;
            padding: 8px;
            width: 175px; /* Fixed width for consistent appearance */
            ${isCurrentPlayer ? 'box-shadow: 0 0 10px #ffffff80;' : ''}
            ${isCurrentPlayer ? 'transform: scale(1.05);' : ''}
        `
    }, [
        // Player name and number
        h('div', {
            style: `
                display: flex;
                align-items: center;
                margin-bottom: 5px;
                border-bottom: 1px solid ${borderColor};
                padding-bottom: 3px;
            `
        }, [
            h('div', { 
                style: `
                    background-color: ${borderColor};
                    color: black;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    margin-right: 8px;
                `
            }, number),
            h('div', { 
                style: `
                    color: white;
                    font-weight: bold;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 120px;
                `
            }, player.nickname || `Player ${number}`)
        ]),
        
        // Stats section
        h('div', {
            style: `
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 5px;
                font-size: 12px;
                color: #cccccc;
            `
        }, [
            // Lives
            h('span', {}, 'Lives:'),
            h('span', {}, Array(player.lives || 3).fill('❤️').join('')),
            
            // Speed
            h('span', {}, 'Speed:'),
            h('span', { style: `color: ${speedColor};` }, speedText),
            
            // Bombs
            h('span', {}, 'Bombs:'),
            h('span', { style: 'color: #ff9900;' }, player.maxBombs || 1),
            
            // Power
            h('span', {}, 'Power:'),
            h('span', { style: 'color: #ff5555;' }, player.bombPower || 1)
        ])
    ]);
}

// Main function to update player stats
export function updatePlayerStats(players, currentPlayerId) {
    // Ensure players is an array
    if (!Array.isArray(players)) {
        console.warn("updatePlayerStats received non-array players:", players);
        players = [];
    }

    try {
        const statsContainer = ensureStatsContainer();
        
        // Clear existing player cards first
        statsContainer.innerHTML = '';
        
        // Sort players by their number for consistent display
        const sortedPlayers = [...players].sort((a, b) => 
            (a.number || a.Number || 1) - (b.number || b.Number || 1)
        );
        
        // Create player cards
        sortedPlayers.forEach(player => {
            try {
                const isCurrentPlayer = player.id === currentPlayerId || player.ID === currentPlayerId;
                const cardElement = renderPlayerCard(player, isCurrentPlayer);
                if (cardElement && cardElement instanceof Element) {
                    statsContainer.appendChild(cardElement);
                } else {
                    console.warn("Invalid card element returned:", cardElement);
                }
            } catch (err) {
                console.error("Error rendering player card:", err);
            }
        });
    } catch (err) {
        console.error("Error in updatePlayerStats:", err);
    }
}

// Helper function to render player card safely
function renderPlayerCard(player, isCurrentPlayer) {
    // In case player is not properly defined
    if (!player) {
        console.warn("Received undefined player");
        return document.createElement('div'); // Return empty div
    }
    
    const cardElement = document.createElement('div');
    // The issue is here - PlayerCard returns a virtual DOM node, not a real DOM element
    const playerCard = PlayerCard(player, isCurrentPlayer);
    
    // Use the render function to convert virtual DOM to real DOM
    render(playerCard, cardElement);
    
    return cardElement;
}

// Toggle visibility of the stats bar
export function toggleStatsBar(show) {
    const statsBar = document.getElementById(STATS_CONTAINER_ID);
    if (statsBar) {
        statsBar.style.display = show ? 'flex' : 'none';
    }
}

// Clean up when game ends
export function removeStatsBar() {
    const statsBar = document.getElementById(STATS_CONTAINER_ID);
    if (statsBar) {
        statsBar.remove();
    }
}