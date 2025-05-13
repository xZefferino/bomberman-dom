import { h } from '../../../framework/index.js';

export function Bombs(state) {
    const { bombs } = state;
    
    if (!bombs) return null;
    
    return h('div', { class: 'bombs' },
        Object.entries(bombs).map(([id, bomb]) => {
            const style = `transform: translate(${bomb.Position.X * 40}px, ${bomb.Position.Y * 40}px)`;
            
            return h('div', { 
                class: 'bomb',
                style: style,
                'data-bomb-id': id
            });
        })
    );
}