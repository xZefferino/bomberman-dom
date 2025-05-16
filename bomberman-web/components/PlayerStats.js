import { h, render } from '../framework/index.js';

// DOM element ID for stats bar
const STATS_CONTAINER_ID = 'player-stats-bar';

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
            flex-direction: column;
            gap: 10px;
            font-family: 'Arial', sans-serif;
        `;
        document.body.appendChild(statsBar);
    }
    return document.getElementById(STATS_CONTAINER_ID);
}

function PlayerCard(player, isCurrentPlayer = false) {
    const number = player.number || player.Number || 1;
    const playerColors = [
        '#ff3333',
        '#33cc33',
        '#ffcc00',
        '#3366ff'
    ];
    const borderColor = playerColors[(number - 1) % playerColors.length];
    let speedText = player.speed ? player.speed.toFixed(1) : '1.0';
    let speedColor = '#ffffff';
    return h('div', {
        style: `
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid ${borderColor};
            border-radius: 4px;
            padding: 8px;
            width: 175px;
            ${isCurrentPlayer ? 'box-shadow: 0 0 10px #ffffff80;' : ''}
            ${isCurrentPlayer ? 'transform: scale(1.05);' : ''}
        `
    }, [
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
        h('div', {
            style: `
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 5px;
                font-size: 12px;
                color: #cccccc;
            `
        }, [
            h('span', {}, 'Lives:'),
            h('span', {}, Array(player.lives || 3).fill('❤️').join('')),
            h('span', {}, 'Speed:'),
            h('span', { style: `color: ${speedColor};` }, speedText),
            h('span', {}, 'Bombs:'),
            h('span', { style: 'color: #ff9900;' }, player.maxBombs || 1),
            h('span', {}, 'Power:'),
            h('span', { style: 'color: #ff5555;' }, player.bombPower || 1)
        ])
    ]);
}

export function updatePlayerStats(players, currentPlayerId) {
    if (!Array.isArray(players)) return;
    try {
        const statsBar = ensureStatsContainer();
        statsBar.innerHTML = '';
        players.forEach(player => {
            const isCurrentPlayer = (player.id || player.ID) === currentPlayerId;
            const cardElement = document.createElement('div');
            const playerCard = PlayerCard(player, isCurrentPlayer);
            render(playerCard, cardElement);
            statsBar.appendChild(cardElement);
        });
        statsBar.style.display = 'flex';
    } catch (err) {
        console.error('Error updating player stats:', err);
    }
}

export function toggleStatsBar(show) {
    const statsBar = document.getElementById(STATS_CONTAINER_ID);
    if (statsBar) {
        statsBar.style.display = show ? 'flex' : 'none';
    }
}

export function removeStatsBar() {
    const statsBar = document.getElementById(STATS_CONTAINER_ID);
    if (statsBar) {
        statsBar.remove();
    }
}
