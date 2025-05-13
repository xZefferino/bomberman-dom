import { h } from '../../../framework/index.js';

export function PowerUps(state) {
    const { powerUps } = state;
    
    if (!powerUps) return null;
    
    return h('div', { class: 'powerups' },
        Object.entries(powerUps).map(([id, powerUp]) => {
            const style = `transform: translate(${powerUp.Position.X * 40}px, ${powerUp.Position.Y * 40}px)`;
            let powerUpClass = 'powerup';
            
            switch(powerUp.Type) {
                case 'speed':
                    powerUpClass += ' powerup-speed';
                    break;
                case 'bomb':
                    powerUpClass += ' powerup-bomb';
                    break;
                case 'flame':
                    powerUpClass += ' powerup-flame';
                    break;
            }
            
            return h('div', { 
                class: powerUpClass,
                style: style,
                'data-powerup-id': id,
                'data-powerup-type': powerUp.Type
            });
        })
    );
}