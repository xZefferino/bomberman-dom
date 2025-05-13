import { h } from '../../../framework/index.js';

export function GameMap(state) {
    // Create a 15x15 grid as defined in the backend
    const mapHeight = 15;
    const mapWidth = 15;
    
    return h('div', { class: 'game-map' },
        Array(mapHeight).fill().map((_, y) => 
            h('div', { class: 'row' },
                Array(mapWidth).fill().map((_, x) => {
                    // Use map data from the server if available
                    let cellClass = 'cell';
                    
                    // Fixed walls pattern (same as backend)
                    if (x === 0 || x === mapWidth - 1 || y === 0 || y === mapHeight - 1 || 
                        (x % 2 === 0 && y % 2 === 0)) {
                        cellClass += ' wall';
                    } else {
                        // Use a seeded pattern for blocks until server data is available
                        const seed = (x * 3 + y * 7) % 10;
                        if (seed < 4 && !(
                            // Avoid placing blocks in starting areas
                            (x <= 2 && y <= 2) || // Top-left
                            (x >= mapWidth - 3 && y <= 2) || // Top-right
                            (x <= 2 && y >= mapHeight - 3) || // Bottom-left
                            (x >= mapWidth - 3 && y >= mapHeight - 3) // Bottom-right
                        )) {
                            cellClass += ' block';
                        } else {
                            cellClass += ' floor';
                        }
                    }
                    
                    return h('div', { 
                        class: cellClass,
                        'data-x': x,
                        'data-y': y
                    });
                })
            )
        )
    );
}