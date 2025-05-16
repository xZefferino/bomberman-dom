import { h, render } from '../framework/index.js';
import { renderBombSprite, BOMB_WIDTH, BOMB_HEIGHT } from './bomb.js';
import { renderPowerUpSprite } from './power.js';
import { renderFlameSprite, FLAME_WIDTH, FLAME_HEIGHT, FLAME_TOTAL_FRAMES, getFlameType } from './flame.js';
import { renderDeathSprite, handlePlayerDeath, deadPlayers, isPlayerDying, isDeathComplete, debugDeathState, DEATH_WIDTH, DEATH_HEIGHT } from './death.js';

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

// Render a single tile (with layers)
function Tile({ type, x, y, player, isSelf }) {
    const layers = [
        h('img', {
            src: SPRITES.ground,
            style: `position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;`
        })
    ];
    if (type === BLOCK_WALL || type === BLOCK_INDESTRUCTIBLE) {
        layers.push(
            h('img', {
                src: SPRITES.indestructible,
                style: `position:absolute;left:0;top:0;width:100%;height:100%;z-index:3;`
            })
        );
    } else if (type === BLOCK_DESTRUCTIBLE) {
        layers.push(
            h('img', {
                src: SPRITES.destructible,
                style: `position:absolute;left:0;top:0;width:100%;height:100%;z-index:2;`
            })
        );
    }
   if (player) {
    const directionMap = {
        up: 0,
        left: 1,
        down: 2,
        right: 3,
    };
    const row = directionMap[player.direction || 'down'];
    const frame = player.frame || 0;
    const frameWidth = 64;
    const frameHeight = 96;
    const number = player.number || player.Number || 1; // ✅ Fix here

    layers.push(
        h('div', {
            style: `
                position:absolute;
                left:-8px; top:-48px;
                width:${frameWidth}px;
                height:${frameHeight}px;
                background: url(${SPRITES.players[number - 1]}) no-repeat;
                background-position: -${frame * frameWidth}px -${row * frameHeight}px;
                background-size: ${frameWidth * SPRITE_FRAMES}px ${frameHeight * 4}px;
                z-index:4;
                ${isSelf ? 'filter:drop-shadow(0 0 8px #0f0);' : ''}
            `
        })
    );

    // Add to the player sprite where you handle speed power-ups
    if (player && player.speed && player.speed > 1.0) {
        layers.push(
            h('div', {
                style: `
                    position: absolute;
                    left: 0; top: 0;
                    width: 100%; height: 100%;
                    background: radial-gradient(circle, transparent 70%, rgba(255,255,0,0.3) 100%);
                    z-index: 3;
                `
            })
        );
    }
}



    return h('div', {
        style: `position:relative;width:${TILE_SIZE}px;height:${TILE_SIZE}px;display:inline-block;`
    }, ...layers);
}

// Update your GameBoard function to add a Play Again button
export function GameBoard({ map, players, selfId, countdown, bombs, deadPlayers, isGameFinished, winner, onPlayAgain }) {
    // Try different ways to access powerUps
    const powerUps = map.powerUps || [];
    const explosions = map.explosions || [];
    
    console.log("PowerUps being rendered:", powerUps);

    const playerGrid = {};
    players.forEach((p) => {
        const pos = p.position || p.Position;
        playerGrid[`${pos.y},${pos.x}`] = { ...p };
    });

    return h('div', {
        style: `display: flex; justify-content: center; align-items: center; width: 100%; height: 100vh;`
    }, 
        h('div', {
            style: `display:inline-block; background:#222; line-height:0; position:relative; ${isGameFinished ? 'filter: brightness(0.8);' : ''}`
        },
            ...(countdown > 0 ? [
                h('div', {
                    style: `position:absolute;left:0;top:0;width:100%;height:100%;z-index:10;
                            background:rgba(0,0,0,0.7);color:#fff;font-size:48px;
                            display:flex;align-items:center;justify-content:center;`
                }, `Game starts in ${countdown}`)
            ] : []),
            
            // Show game over message if the game is finished
            ...(isGameFinished ? [
                h('div', {
                    style: `position:absolute;left:0;top:0;width:100%;height:100%;z-index:50;
                            background:rgba(0,0,0,0.5);color:#fff;font-size:48px;
                            display:flex;align-items:center;justify-content:center;`
                }, h('div', {
                    style: `text-align: center;`
                }, [
                    h('div', {}, 'GAME OVER'),
                    h('div', {
                        style: `font-size: 30px; margin-top: 50px;`
                    }, winner
                        ? `${winner.nickname || 'Player ' + (winner.number || winner.Number || 1)} WINS!`
                        : 'No winners this time!'
                    ),
                    h('button', {
                        style: `
                            margin-top: 30px;
                            padding: 10px 20px;
                            font-size: 18px;
                            background: #4CAF50;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                        `,
                        onclick: () => {
                            console.log("Play Again button clicked - resetting game");
                            if (typeof onPlayAgain === 'function') {
                                onPlayAgain(); // Call the provided callback instead of reloading
                            } else {
                                console.log("No onPlayAgain callback provided, falling back to page reload");
                                window.location.reload();
                            }
                        }
                    }, 'Play Again')
                ]))
            ] : []),

            // 🔲 Render map tiles
            map.blocks.map((row, y) =>
                h('div', { style: 'display: flex;' },
                    row.map((type, x) => {
                        const player = playerGrid[`${y},${x}`];
                        const isSelf = player && (player.ID === selfId || player.id === selfId);
                        return Tile({ type, x, y, player, isSelf });
                    })
                )
            ),
            ...(bombs.map((bomb) => {
                const pos = bomb.position || bomb.Position;
                const frame = Math.floor(Date.now() / 150) % 7;

                          const sprite = renderBombSprite({
                    imageUrl: './aseets/sprites/bomb.png',
                    frame
                });

                return h('div', {
                    key: bomb.ID || `bomb-${pos.x}-${pos.y}`,
                    style: `
                        position: absolute;
                        left: ${pos.x * TILE_SIZE}px;
                        top: ${pos.y * TILE_SIZE}px;
                        width: ${BOMB_WIDTH}px;
                        height: ${BOMB_HEIGHT}px;
                        z-index: 5; /* Increased from 4 to be above flames */
                        pointer-events: none;
                    `
                }, h(sprite.tag, sprite.attrs));
            })),


   ...(explosions.flatMap((explosion, idx) => {
    const frame = explosion.frame || 0; // comes from state

    return explosion.tiles.map((tile, i) => {
        const type = getFlameType(tile, explosion.center, explosion);
        const flameSprite = renderFlameSprite({
            imageUrl: './aseets/sprites/flame.png',
            type,
            power: explosion.range,
            frame
        });

        return h(flameSprite.tag, {
            key: `flame-${tile.x}-${tile.y}-${idx}-${i}`,
            ...flameSprite.attrs,
            style: `
                ${flameSprite.attrs.style || ''}
                position: absolute;
                left: ${tile.x * TILE_SIZE}px;
                top: ${tile.y * TILE_SIZE}px;
                width: ${FLAME_WIDTH}px;
                height: ${FLAME_HEIGHT}px;
                z-index: 10;
                pointer-events: none;
            `
        });
    });
})),



           ...(powerUps.map((p) => {
                console.log("Rendering power-up:", p);
                // Handle both position and Position (case-insensitive)
                const position = p.position || p.Position;
                
                if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
                    console.error("Invalid power-up position:", p);
                    return null;
                }
                
                const sprite = renderPowerUpSprite({ type: p.type || p.Type });
                return h('div', {
                    key: `powerup-${p.id || p.ID || `pos-${position.x}-${position.y}`}`,
                    style: `
                        position: absolute;
                        left: ${position.x * TILE_SIZE}px;
                        top: ${position.y * TILE_SIZE}px;
                        width: ${TILE_SIZE}px;
                        height: ${TILE_SIZE}px;
                        z-index: 3;
                    `
                }, h(sprite.tag, sprite.attrs));
            }).filter(Boolean)),

            // 🧍 Render players absolutely on top
            ...players.map((p) => {
                const pos = p.position || p.Position;
                const number = p.number || p.Number || 1;
                const isSelf = p.ID === selfId;

                const rowMap = { up: 0, left: 1, down: 2, right: 3 };
                const row = rowMap[p.direction || 'down'];
                const frame = p.frame || 0;
                const frameWidth = 64;
                const frameHeight = 96;

                return h('div', {
                    key: p.ID,
                    style: `
                        position: absolute;
                        left: ${pos.x * TILE_SIZE - 8}px;
                        top: ${pos.y * TILE_SIZE - 48}px;
                        width: ${frameWidth}px;
                        height: ${frameHeight}px;
                        background: url(${SPRITES.players[number - 1]}) no-repeat;
                        background-position: -${frame * frameWidth}px -${row * frameHeight}px;
                        background-size: ${frameWidth * SPRITE_FRAMES}px ${frameHeight * 4}px;
                        z-index: 5;
                        transition: left 0.2s linear, top 0.2s linear;
                        ${isSelf ? 'filter:drop-shadow(0 0 8px #0f0);' : ''}
                    `
                });
            }),

            // 💀 Render death animations for any dead players
            ...Object.entries(deadPlayers)
            .filter(([id, state]) => !state.done)
            .map(([id, state]) => {
                // Skip if missing critical data
                if (!state || !state.position || typeof state.position.x !== 'number') {
                    console.error(`Invalid death state for ${id}:`, state);
                    return null;
                }
                
                console.log(`Rendering death animation for player ${id}:`, state);
                try {
                    const deathSprite = renderDeathSprite({
                        imageUrl: './aseets/sprites/death.png',
                        playerNumber: state.playerNumber,
                        frame: state.frame
                    });
                    
                    return h('div', {
                        key: `death-${id}`,
                        style: `
                            position: absolute;
                            left: ${state.position.x * TILE_SIZE - 8}px;
                            top: ${state.position.y * TILE_SIZE - 48}px;
                            width: ${DEATH_WIDTH}px;
                            height: ${DEATH_HEIGHT}px;
                            z-index: 20;
                            pointer-events: none;
                        `
                    }, h(deathSprite.tag, deathSprite.attrs));
                } catch (err) {
                    console.error(`Error rendering death animation for ${id}:`, err);
                    return null;
                }
            }).filter(Boolean)
        )
    );
}


// Example usage (replace with real state/game data)
export function renderGame(root, gameState, selfId, onPlayAgain) {
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
                    players: state.map.players || [],
                    selfId,
                    countdown: state.countdown,
                    bombs: state.bombs || [],
                    deadPlayers,
                    isGameFinished,
                    winner,
                    onPlayAgain // Pass the callback here
                }),
            ].filter(Boolean)),
            root
        );
    } catch (error) {
        console.error("Error rendering game:", error);
    }
}

