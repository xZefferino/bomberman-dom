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
    
    // Check if game is finished (state 3)
    const isGameFinished = state.state === 3;

    // Find the winner if the game is finished
    let winner = null;
    if (isGameFinished && state.map && Array.isArray(state.map.players)) {
        // Winner is the last player with lives > 0
        const alivePlayers = state.map.players.filter(p => (p.lives || p.Lives) > 0);
        if (alivePlayers.length === 1) {
            winner = alivePlayers[0];
        }
    }

    // Even if game is finished, we should still render the last state
    // but don't filter out dead players in this case, so we can see where everyone ended up
    if (!isGameFinished && state.map && state.map.players) {
        // Filter out players with 0 lives from rendering only if game isn't finished
        state.map.players = state.map.players.filter(player => {
            const lives = player.lives || player.Lives || 0;
            return lives > 0;
        });
    }
    
    // Process player deaths more robustly
    if (state.map && state.map.players) {
        // Create dead player tracking sets
        const deadPlayerIds = new Set();
        const currentPlayerIds = new Set();
        
        // Track all current players
        state.map.players.forEach(player => {
            const id = player.id || player.ID;
            currentPlayerIds.add(id);
            
            const lives = player.lives || player.Lives || 0;
            if (lives <= 0) {
                deadPlayerIds.add(id);
            }
        });
        
        // First pass: identify new dead players and start their animations
        state.map.players.forEach(player => {
            const id = player.id || player.ID;
            const lives = player.lives || player.Lives || 0;
            
            if (lives <= 0) {
                // Start death animation if not already started
                if (!isPlayerDying(id) && !isDeathComplete(id)) {
                    console.log(`🔴 NEW DEATH: Player ${id} is dead, starting death animation`);
                    const pos = player.position || player.Position;
                    const number = player.number || player.Number || 1;
                    handlePlayerDeath(id, number, pos);
                }
            }
        });
        
        // Remove dead players from the main players array
        state.map.players = state.map.players.filter(player => {
            const id = player.id || player.ID;
            return !deadPlayerIds.has(id);
        });
        
        // Add a debug snapshot of current death animations
        const activeDeaths = debugDeathState();
        if (activeDeaths > 0) {
            console.log(`🔄 Active death animations: ${activeDeaths}`);
        }
        
        // Update any ongoing death animations
        Object.entries(deadPlayers).forEach(([id, state]) => {
            if (!state.done) {
                handlePlayerDeath(id, state.playerNumber, state.position);
            }
        });
    }

    // Extract powerUps from the correct location in the state
    const powerUps = state.powerUps ? Object.values(state.powerUps) : [];
    const flameFrame = Math.floor(Date.now() / 100) % FLAME_TOTAL_FRAMES;

    // Clone players and inject localPlayerFrame for the self player
    const playersWithLocalFrame = (state.map.players || []).map(p => {
        if ((p.id || p.ID) === selfId) {
            return { ...p, frame: localPlayerFrame };
        }
        return p;
    });

    // Update the renderGame function where you call GameBoard
    try {
        // Render the game board with all components
        render(
            h('div', {}, [
                GameBoard({
                    map: {
                        ...state.map,
                        powerUps: powerUps,
                        explosions: (state.explosions || []).map(explosion => ({
                            ...explosion,
                            frame: flameFrame 
                        }))
                    },
                    players: playersWithLocalFrame, // <-- use the new array here!
                    selfId,
                    countdown: state.countdown,
                    bombs: state.bombs || [],
                    deadPlayers,
                    isGameFinished,
                    winner,
                    onPlayAgain, // Pass the callback here
                    localPlayerFrame,
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

