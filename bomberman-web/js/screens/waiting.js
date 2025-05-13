import { h } from '../../../framework/index.js';

export function WaitingScreen(state) {
    const { gameState, countdown } = state;
    const playerCount = Object.keys(state.players || {}).length;
    
    return h('div', { class: 'waiting-container' },
        h('h1', {}, 'Waiting for players'),
        h('div', { class: 'player-counter' },
            `${playerCount} / 4 players connected`
        ),
        countdown !== null
            ? h('div', { class: 'countdown' }, `Game starts in ${countdown} seconds`)
            : playerCount >= 2
                ? h('div', {}, 'Waiting for more players or timeout...')
                : h('div', {}, 'Need at least 2 players to start')
    );
}