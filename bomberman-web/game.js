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
export function renderGame(root, gameState, selfId, onPlayAgain, localPlayerFrame = 0) {
    const state = gameState.state;
    
    if (!state || !state.map || !Array.isArray(state.map.blocks) || state.map.blocks.length === 0) {
        render(h('div', {}, '⚠️ Waiting for game to start...'), root);
        return;
    }
    
    const isGameFinished = state.state === 3;
    let winner = null;
    if (isGameFinished && state.map && Array.isArray(state.map.players)) {
        const alivePlayers = state.map.players.filter(p => (p.lives || p.Lives) > 0);
        if (alivePlayers.length === 1) {
            winner = alivePlayers[0];
        }
    }

    let playersToRender = state.map.players || [];
    if (!isGameFinished && state.map && state.map.players) {
        playersToRender = state.map.players.filter(player => {
            const lives = player.lives || player.Lives || 0;
            return lives > 0;
        });
    }
    
    if (state.map && state.map.players) {
        const deadPlayerIds = new Set();
        state.map.players.forEach(player => {
            const id = player.id || player.ID;
            const lives = player.lives || player.Lives || 0;
            if (lives <= 0) {
                deadPlayerIds.add(id);
            }
        });
        
        state.map.players.forEach(player => {
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

    const powerUps = state.powerUps ? Object.values(state.powerUps) : [];
    const flameFrame = Math.floor(Date.now() / 100) % FLAME_TOTAL_FRAMES;

    try {
        render(
            h('div', {}, [
                GameBoard({
                    map: {
                        ...state.map,
                        blocks: state.map.blocks, 
                        powerUps: powerUps,
                        explosions: (state.explosions || []).map(explosion => ({
                            ...explosion,
                            frame: flameFrame 
                        }))
                    },
                    players: playersToRender, // Pass original filtered players
                    selfId,
                    localPlayerFrame, // Pass localPlayerFrame as a separate prop
                    countdown: state.countdown,
                    bombs: state.bombs || [],
                    deadPlayers,
                    isGameFinished,
                    winner,
                    onPlayAgain,
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
                    }
                }),
            ].filter(Boolean)),
            root
        );
    } catch (error) {
        console.error("Error rendering game:", error);
    }
}

