import { h } from '../../../framework/index.js';
import { getState, setState } from '../../../framework/state.js';

export function Chat(state) {
    const { chatMessages = [], isChatOpen = true, playerID } = state;
    
    if (!isChatOpen) {
        return h('div', { class: 'chat-toggle-btn' },
            h('button', { 
                onclick: () => setState({ isChatOpen: true }) 
            }, 'Show Chat')
        );
    }
    
    return h('div', { class: 'chat-container' },
        h('div', { class: 'chat-header' },
            h('span', {}, 'Chat'),
            h('span', { 
                class: 'chat-toggle',
                onclick: () => setState({ isChatOpen: false })
            }, '✕')
        ),
        h('div', { class: 'chat-messages' },
            chatMessages.map(msg => 
                h('div', { class: 'chat-message' },
                    h('strong', {}, `${msg.playerName}: `),
                    h('span', {}, msg.message)
                )
            )
        ),
        h('form', { 
            class: 'chat-input',
            onsubmit: (e) => {
                e.preventDefault();
                const input = e.target.elements.message;
                const message = input.value.trim();
                
                if (message) {
                    // Send message via WebSocket
                    window.wsClient.send('chat', {
                        playerID,
                        message
                    });
                    
                    input.value = '';
                }
            }
        },
            h('input', { 
                type: 'text', 
                name: 'message',
                placeholder: 'Type a message...' 
            }),
            h('button', { type: 'submit' }, 'Send')
        )
    );
}