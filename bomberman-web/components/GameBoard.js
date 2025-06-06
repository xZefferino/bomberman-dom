// GameBoard component extracted from game.js
import { Tile } from './Tile.js';
import { h } from '../framework/index.js';
export function GameBoard({ map, players, selfId, countdown, bombs, deadPlayers, isGameFinished, winner, onPlayAgain, localPlayerFrame, helpers, gameStartCountdownTime }) {
    const { SPRITES, SPRITE_FRAMES, BLOCK_WALL, BLOCK_DESTRUCTIBLE, BLOCK_INDESTRUCTIBLE, TILE_SIZE, renderBombSprite, renderFlameSprite, renderPowerUpSprite, renderDeathSprite, getFlameType, BOMB_WIDTH, BOMB_HEIGHT, FLAME_WIDTH, FLAME_HEIGHT, DEATH_WIDTH, DEATH_HEIGHT } = helpers;

    // Try different ways to access powerUps
    const powerUps = map.powerUps || [];
    const explosions = map.explosions || [];
    
    // console.log("PowerUps being rendered:", powerUps); // Keep for debugging if needed

    return h('div', {
        style: `display: flex; justify-content: center; align-items: center; width: 100%; height: 100vh;`
    }, 
        h('div', {
            style: `display:inline-block; background:#222; line-height:0; position:relative; ${isGameFinished ? 'filter: brightness(0.8);' : ''}`
        },
            // Use gameStartCountdownTime for the "Game starts in X" message
            ...(gameStartCountdownTime > 0 ? [
                h('div', {
                    style: `position:absolute;left:0;top:0;width:100%;height:100%;z-index:10;
                            background:rgba(0,0,0,0.7);color:#fff;font-size:48px;
                            display:flex;align-items:center;justify-content:center;`
                }, `Game starts in ${gameStartCountdownTime}`)
            ] : []),
            
            // 🔲 Render map tiles
            map.blocks.map((row, y) =>
                h('div', { style: 'display: flex;' },
                    row.map((type, x) => {
                        // REMOVED: player lookup and isSelf calculation here
                        // Pass only necessary props to Tile
                        return Tile({ type, x, y, SPRITES, SPRITE_FRAMES, BLOCK_WALL, BLOCK_DESTRUCTIBLE, BLOCK_INDESTRUCTIBLE, TILE_SIZE });
                    })
                )
            ),

            // ADDED: Direct player rendering loop
            ...(players.flatMap((player) => {
                const pos = player.position || player.Position;
                if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
                    // console.warn("Skipping player with invalid position:", player); // Keep for debugging
                    return []; // Return empty array for flatMap
                }

                const elementsToRender = [];

                const isSelf = (player.id || player.ID) === selfId;
                const directionMap = { up: 0, left: 1, down: 2, right: 3 };
                const row = directionMap[player.direction || 'down'];
                
                // Use localPlayerFrame for self, otherwise player.frame
                const frame = isSelf ? localPlayerFrame : (player.frame || 0); 
                const frameWidth = 64;
                const frameHeight = 96;
                const number = player.number || player.Number || 1;

                const playerStyle = `
                    position:absolute;
                    left:${pos.x * TILE_SIZE - 8}px; 
                    top:${pos.y * TILE_SIZE - 48}px;
                    width:${frameWidth}px;
                    height:${frameHeight}px;
                    background: url(${SPRITES.players[number - 1]}) no-repeat;
                    background-position: -${frame * frameWidth}px -${row * frameHeight}px;
                    background-size: ${frameWidth * SPRITE_FRAMES}px ${frameHeight * 4}px;
                    z-index:4;
                    ${isSelf ? 'filter:drop-shadow(0 0 8px #0f0);' : ''}
                `;
                elementsToRender.push(h('div', { style: playerStyle, key: `player-${player.id || player.ID}` }));

                if (player.speed && player.speed > 1.0) {
                    elementsToRender.push(
                        h('div', {
                            key: `speed-${player.id || player.ID}`,
                            style: `
                                position: absolute;
                                left: ${pos.x * TILE_SIZE}px; 
                                top: ${pos.y * TILE_SIZE}px;   
                                width: ${TILE_SIZE}px; 
                                height: ${TILE_SIZE}px;
                                background: radial-gradient(circle, transparent 70%, rgba(255,255,0,0.3) 100%);
                                z-index: 3; 
                                pointer-events: none;
                            `
                        })
                    );
                }
                return elementsToRender;
            })),
            
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
    const timestamp = explosion.timestamp || Date.now();
    const frame = explosion.frame || 0;
    const elapsedTime = Date.now() - timestamp;
    
    // Skip rendering if the explosion is too old (over 750ms)
    if (elapsedTime > 750) {
        return [];
    }

    return explosion.tiles.map((tile, i) => {
        const type = getFlameType(tile, explosion.center, explosion);
        const flameSprite = renderFlameSprite({
            imageUrl: './aseets/sprites/flame.png',
            type,
            power: explosion.range,
            frame,
            elapsedTime
        });

        // Base z-index for flames starts at 6 (above bombs)
        // Add small increments for newer explosions
        const baseZIndex = 6;
        const timeOffset = Math.floor((750 - elapsedTime) / 100);
        const dynamicZIndex = baseZIndex + timeOffset;

        return h(flameSprite.tag, {
            key: `flame-${tile.x}-${tile.y}-${timestamp}-${idx}-${i}`,
            ...flameSprite.attrs,
            style: `
                ${flameSprite.attrs.style || ''}
                position: absolute;
                left: ${tile.x * TILE_SIZE}px;
                top: ${tile.y * TILE_SIZE}px;
                z-index: ${dynamicZIndex};
                will-change: opacity, transform;
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

            // Commented out: Players are already rendered by Tile components (this comment is now misleading, live players are rendered above)
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

// GameUI component extracted from game.js
export function GameUI({ map, players, selfId, countdown, bombs, deadPlayers, isGameFinished, winner, /* onPlayAgain, REMOVED */ helpers, gameStartTime }) {
    // Pass gameStartTime (which is the countdown value for game start) to GameBoard
    const gameBoardComponent = GameBoard({ map, players, selfId, localPlayerFrame: map.localPlayerFrame, bombs, deadPlayers, isGameFinished, winner, helpers, gameStartCountdownTime: countdown });

    let overlayContent = null;
    if (isGameFinished) {
        const winnerName = winner ? (winner.nickname || `Player ${winner.number}`) : 'No one';
        overlayContent = h('div', { class: 'game-overlay-content' }, [
            h('h2', {}, 'Game Over!'),
            h('p', {}, `${winnerName} wins!`),
            h('p', { id: 'restart-countdown' }, 'Restarting in 5 seconds...') // Countdown message
        ]);
    } else if (countdown !== undefined && countdown > 0) {
        overlayContent = h('div', { class: 'game-overlay-content' }, [
            h('h2', {}, 'Get Ready!'),
            h('p', {}, `Game starts in ${countdown} seconds`)
        ]);
    }

    return h('div', { id: 'game-ui', style: 'position: relative;' }, [
        gameBoardComponent,
        // The overlay for "Game starts in X" is now handled inside GameBoard directly.
        // We only need the Game Over overlay here.
        (isGameFinished && overlayContent) ? h('div', { class: 'game-overlay' }, overlayContent) : null
    ]);
}

