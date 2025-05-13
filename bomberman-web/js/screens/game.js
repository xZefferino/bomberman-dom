import { h } from '../../../framework/index.js';
import { Chat } from '../components/chat.js';
import { GameMap } from '../components/game-map.js';
import { Players } from '../components/players.js';
import { Bombs } from '../components/bombs.js';
import { PowerUps } from '../components/powerups.js';

export function GameScreen(state, inputManager) {
    const { gameState, players, bombs, powerUps, playerID } = state;
    
    // Check if game is finished
    const isGameOver = gameState === 3; // GameFinished
    const winner = isGameOver ? findWinner(players) : null;
    
    // Get current player info
    const currentPlayer = players[playerID] || {};
    
    return h('div', { class: 'game-container' },
        h('div', { class: 'game-header' },
            h('div', { class: 'player-info' },
                `Player: ${currentPlayer.Nickname || 'Unknown'}`,
                h('div', { class: 'player-lives' },
                    Array(currentPlayer.Lives || 0).fill().map(() => 
                        h('div', { class: 'life' })
                    )
                )
            ),
            h('div', { class: 'game-stats' },
                `Players alive: ${countAlivePlayers(players)}`
            )
        ),
        h('div', { class: 'map-container' },
            GameMap(state),
            Players(state),
            Bombs(state),
            PowerUps(state)
        ),
        Chat(state),
        isGameOver && h('div', { class: 'game-over' },
            h('div', { class: 'winner' }, 
                winner 
                    ? `${winner.Nickname} wins!` 
                    : 'Game Over!'
            ),
            h('button', { 
                onclick: () => window.location.reload()
            }, 'Play Again')
        )
    );
}

function findWinner(players) {
    if (!players) return null;
    
    for (const id in players) {
        if (players[id].Lives > 0) {
            return players[id];
        }
    }
    return null;
}

function countAlivePlayers(players) {
    if (!players) return 0;
    
    let count = 0;
    for (const id in players) {
        if (players[id].Lives > 0) {
            count++;
        }
    }
    return count;
}