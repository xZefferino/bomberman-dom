import { h } from '../../../framework/index.js';

export function LoginScreen(onLogin) {
    return h('div', { class: 'login-container' },
        h('h1', {}, 'Bomberman DOM'),
        h('form', { 
            onsubmit: (e) => {
                e.preventDefault();
                const nickname = e.target.elements.nickname.value.trim();
                if (nickname) {
                    onLogin(nickname);
                }
            }
        },
            h('div', { class: 'input-group' },
                h('input', { 
                    type: 'text', 
                    name: 'nickname', 
                    placeholder: 'Enter your nickname',
                    maxlength: '15',
                    required: 'true',
                    autocomplete: 'off'
                })
            ),
            h('button', { type: 'submit' }, 'Join Game')
        )
    );
}