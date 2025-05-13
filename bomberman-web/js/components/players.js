import { h } from '../../../framework/index.js';

export function Players(state) {
    const { players } = state;
    
    if (!players) return null;
    
    return h('div', { class: 'players' },
        Object.entries(players).map(([id, player], index) => {
            if (player.Lives <= 0) return null;
            
            // Use modulo to cycle through player sprites
            const playerIndex = index % 4;
            const style = `transform: translate(${player.Position.X * 40}px, ${player.Position.Y * 40}px)`;
            const playerClass = `player player-${playerIndex}`;
            
            return h('div', { 
                class: playerClass,
                style: style,
                'data-player-id': id,
                'data-player-name': player.Nickname
            });
        })
    );
}