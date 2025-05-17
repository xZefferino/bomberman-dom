import { h, render } from './framework/index.js';
import { Tile } from './components/Tile.js';
import { GameBoard } from './components/GameBoard.js';
import { renderBombSprite, renderFlameSprite, renderPowerUpSprite, renderDeathSprite } from './components/sprites.js';
import { getFlameType } from './components/utils.js';
import { handlePlayerDeath, deadPlayers, isPlayerDying, isDeathComplete, debugDeathState, DEATH_WIDTH, DEATH_HEIGHT } from './death.js';
import { FLAME_TOTAL_FRAMES, FLAME_WIDTH, FLAME_HEIGHT } from './flame.js';
import { BOMB_WIDTH, BOMB_HEIGHT } from './bomb.js';

// Map block types (must match backend)
const BLOCK_WALL = 1;          // brick3 (indestructible)
const BLOCK_DESTRUCTIBLE = 2;  // brick2 (destructible)
const BLOCK_INDESTRUCTIBLE = 3;// brick3 (indestructible, interior)

const TILE_SIZE = 48; // px, adjust as needed

const SPRITE_FRAMES = 9;

// Sprite sources (replace with your actual paths)
const SPRITES = {
    ground: './aseets/sprites/brick1.png',
    destructible: './aseets/sprites/brick2.png',
    indestructible: './aseets/sprites/brick3.png',
    players: [
        './aseets/sprites/character1.png',
        './aseets/sprites/character2.png',
        './aseets/sprites/character3.png',
        './aseets/sprites/character4.png',
    ]
};

// Example usage (replace with real state/game data)
export function renderGame(root, gameState, selfId, localPlayerFrame = 0, onPlayAgainCallback) { // Added onPlayAgainCallback
    const serverGame = gameState.state; // Assuming gameState is the full message, and .state is the game data

    if (!serverGame || typeof serverGame.state === 'undefined') {
        console.warn("renderGame: serverGame or serverGame.state is undefined. Full gameState:", gameState);
        render(h('div', {}, '⚠️ Waiting for valid game state...'), root);
        return;
    }
    
    // Log the crucial state values
    console.log(
        "renderGame: Received serverGame.state:", serverGame.state, 
        "serverGame.countdown:", serverGame.countdown,
        "Full serverGame object:", serverGame
    );

    const isGameFinished = serverGame.state === 3; // GameOver state (state 3)
    // const gameStartCountdownTime = (serverGame.state === 1 && serverGame.countdown > 0) ? serverGame.countdown : 0; // GameCountdown state (state 1)
    
    let gameStartCountdownDisplayValue = 0;
    if (serverGame.state === 1) { // GameCountdown state (state 1)
        if (serverGame.countdown > 0) {
            gameStartCountdownDisplayValue = serverGame.countdown;
        } else {
            // If serverGame.countdown is 0 (or less) but state is still 1,
            // it implies the server is about to transition to state 2 (GameRunning).
            // To prevent the countdown message from disappearing prematurely,
            // we display "1" to hold it for this final tick.
            // The message will disappear when serverGame.state changes to 2.
            gameStartCountdownDisplayValue = 1;
        }
    }
    
    console.log(
        "renderGame: Calculated isGameFinished:", isGameFinished,
        // "Calculated gameStartCountdownTime:", gameStartCountdownTime
        "Calculated gameStartCountdownDisplayValue:", gameStartCountdownDisplayValue
    );
    
    let winner = null;
    if (isGameFinished && serverGame.map && Array.isArray(serverGame.map.players)) {
        const alivePlayers = serverGame.map.players.filter(p => (p.lives || p.Lives) > 0);
        if (alivePlayers.length === 1) {
            winner = alivePlayers[0];
        }
    }

    let playersToRender = serverGame.map.players || [];
    if (!isGameFinished && serverGame.map && serverGame.map.players) {
        playersToRender = serverGame.map.players.filter(player => {
            const lives = player.lives || player.Lives || 0;
            return lives > 0;
        });
    }
    
    if (serverGame.map && serverGame.map.players) {
        const deadPlayerIds = new Set();
        serverGame.map.players.forEach(player => {
            const id = player.id || player.ID;
            const lives = player.lives || player.Lives || 0;
            if (lives <= 0) {
                deadPlayerIds.add(id);
            }
        });
        
        serverGame.map.players.forEach(player => {
            const id = player.id || player.ID;
            const lives = player.lives || player.Lives || 0;
            if (lives <= 0) {
                if (!isPlayerDying(id) && !isDeathComplete(id)) {
                    const pos = player.position || player.Position;
                    const number = player.number || player.Number || 1;
                    handlePlayerDeath(id, number, pos);
                }
            }
        });
        
        if (!isGameFinished) {
            playersToRender = playersToRender.filter(player => {
                const id = player.id || player.ID;
                return !deadPlayerIds.has(id);
            });
        }
        
        Object.entries(deadPlayers).forEach(([id, deathState]) => {
            if (!deathState.done) {
                handlePlayerDeath(id, deathState.playerNumber, deathState.position);
            }
        });
    }

    const powerUps = serverGame.powerUps ? Object.values(serverGame.powerUps) : [];
    const flameFrame = Math.floor(Date.now() / 100) % FLAME_TOTAL_FRAMES;

    try {
        render(
            h('div', {}, [
                GameBoard({
                    map: {
                        ...serverGame.map, // Use serverGame here
                        blocks: serverGame.map.blocks, 
                        powerUps: powerUps,
                        explosions: (serverGame.explosions || []).map(explosion => ({ // Use serverGame here
                            ...explosion,
                            frame: flameFrame 
                        }))
                    },
                    players: playersToRender, // Pass original filtered players
                    selfId,
                    localPlayerFrame, // Pass localPlayerFrame as a separate prop
                    countdown: serverGame.countdown, // Pass the raw countdown from server state
                    bombs: serverGame.bombs || [], // Use serverGame here
                    deadPlayers,
                    isGameFinished, // Pass calculated isGameFinished
                    winner,
                    onPlayAgain: onPlayAgainCallback, // Pass the callback
                    helpers: {
                        SPRITES,
                        SPRITE_FRAMES,
                        BLOCK_WALL,
                        BLOCK_DESTRUCTIBLE,
                        BLOCK_INDESTRUCTIBLE,
                        TILE_SIZE,
                        renderBombSprite,
                        renderFlameSprite,
                        renderPowerUpSprite,
                        renderDeathSprite,
                        getFlameType,
                        BOMB_WIDTH,
                        BOMB_HEIGHT,
                        FLAME_WIDTH,
                        FLAME_HEIGHT,
                        DEATH_WIDTH,
                        DEATH_HEIGHT
                    },
                    // gameStartCountdownTime: gameStartCountdownTime // Pass calculated gameStartCountdownTime
                    gameStartCountdownTime: gameStartCountdownDisplayValue
                }),
            ].filter(Boolean)),
            root
        );
    } catch (error) {
        console.error("Error rendering game:", error);
    }
}

