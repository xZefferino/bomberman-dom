/**
 * This utility script creates placeholder sprites for development
 * These would be replaced with proper game assets in production
 */

function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

// Create wall sprite
function createWallSprite() {
    const canvas = createCanvas(40, 40);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#555';
    ctx.fillRect(0, 0, 40, 40);
    
    ctx.fillStyle = '#777';
    ctx.fillRect(2, 2, 36, 36);
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 40, 40);
    
    return canvas.toDataURL();
}

// Create block sprite
function createBlockSprite() {
    const canvas = createCanvas(40, 40);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#aa7744';
    ctx.fillRect(0, 0, 40, 40);
    
    ctx.fillStyle = '#bb8855';
    ctx.fillRect(5, 5, 30, 30);
    
    ctx.strokeStyle = '#996633';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 40, 40);
    
    return canvas.toDataURL();
}

// Create floor sprite
function createFloorSprite() {
    const canvas = createCanvas(40, 40);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#448844';
    ctx.fillRect(0, 0, 40, 40);
    
    // Add texture
    ctx.fillStyle = '#559955';
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillRect(i * 8, j * 8, 8, 8);
            }
        }
    }
    
    return canvas.toDataURL();
}

// Create player sprites
function createPlayerSprite(color) {
    const canvas = createCanvas(40, 40);
    const ctx = canvas.getContext('2d');
    
    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(20, 20, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Face
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(20, 15, 8, 0, Math.PI);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(15, 15, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(25, 15, 2, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas.toDataURL();
}

// Create bomb sprite
function createBombSprite() {
    const canvas = createCanvas(30, 30);
    const ctx = canvas.getContext('2d');
    
    // Bomb body
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(15, 15, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Fuse
    ctx.strokeStyle = '#aa5500';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(15, 3);
    ctx.lineTo(15, 8);
    ctx.stroke();
    
    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(10, 10, 4, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas.toDataURL();
}

// Create explosion sprite
function createExplosionSprite() {
    const canvas = createCanvas(40, 40);
    const ctx = canvas.getContext('2d');
    
    // Create radial gradient
    const gradient = ctx.createRadialGradient(20, 20, 5, 20, 20, 20);
    gradient.addColorStop(0, 'rgba(255, 255, 0, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 128, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0.1)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(20, 20, 20, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas.toDataURL();
}

// Create power-up sprites
function createPowerUpSprite(color, text) {
    const canvas = createCanvas(25, 25);
    const ctx = canvas.getContext('2d');
    
    // Box
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 25, 25);
    
    // Border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 21, 21);
    
    // Text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 12.5, 12.5);
    
    return canvas.toDataURL();
}

// Generate all sprites
function generateSprites() {
    const sprites = {
        wall: createWallSprite(),
        block: createBlockSprite(),
        floor: createFloorSprite(),
        player1: createPlayerSprite('#ff0000'),
        player2: createPlayerSprite('#0000ff'),
        player3: createPlayerSprite('#ffff00'),
        player4: createPlayerSprite('#00ff00'),
        bomb: createBombSprite(),
        explosion: createExplosionSprite(),
        'powerup-speed': createPowerUpSprite('#ff9900', 'S'),
        'powerup-bomb': createPowerUpSprite('#ff0000', 'B'),
        'powerup-flame': createPowerUpSprite('#ffff00', 'F')
    };
    
    // Output sprite data URLs
    console.log('Generated sprites:');
    Object.entries(sprites).forEach(([name, dataUrl]) => {
        console.log(`${name}: ${dataUrl.substring(0, 50)}...`);
        
        // Create download links
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${name}.png`;
        link.textContent = `Download ${name}`;
        document.body.appendChild(link);
        document.body.appendChild(document.createElement('br'));
    });
}

// Run on page load
window.addEventListener('load', generateSprites);