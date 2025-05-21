function showWelcomePopup() {
    const popupId = 'bomberman-welcome-popup';
    const alreadyVisited = localStorage.getItem('bomberman_visited');

    if (alreadyVisited) {
        return; // Don't show popup if already visited
    }

    // Create popup elements
    const overlay = document.createElement('div');
    overlay.id = popupId + '-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.zIndex = '2000';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';

    const popup = document.createElement('div');
    popup.id = popupId;
    popup.style.backgroundColor = '#2c2c3a'; // Dark theme
    popup.style.color = '#e0e0e0';
    popup.style.padding = '30px';
    popup.style.borderRadius = '10px';
    popup.style.boxShadow = '0 5px 20px rgba(0,0,0,0.5)';
    popup.style.width = '90%';
    popup.style.maxWidth = '600px';
    popup.style.fontFamily = "'Arial', sans-serif";
    popup.style.lineHeight = '1.6';
    popup.style.textAlign = 'left';
    popup.style.maxHeight = '80vh';
    popup.style.overflowY = 'auto';

    const title = document.createElement('h2');
    title.textContent = 'Welcome to Bomberman!';
    title.style.color = '#61dafb';
    title.style.textAlign = 'center';
    title.style.borderBottom = '1px solid #444';
    title.style.paddingBottom = '15px';
    title.style.marginBottom = '20px';

    const content = document.createElement('div');
    content.innerHTML = `
        <p><strong>The Goal:</strong> Be the last bomber standing! Strategically place bombs to eliminate opponents and clear destructible blocks.</p>
        
        <h4>Game Basics:</h4>
        <ul>
            <li><strong>Movement:</strong> Use arrow keys or WASD to move your character.</li>
            <li><strong>Placing Bombs:</strong> Press Spacebar or Enter to drop a bomb. Bombs explode after a short fuse, clearing a path in four directions.</li>
            <li><strong>Bomb Cooldown:</strong> There's a <strong>600ms (0.6 seconds) cooldown</strong> between placing bombs. This prevents spamming, promotes and encourages tactical placement. Plan your moves!</li>
            <li><strong>Destructible Blocks:</strong> Some blocks can be destroyed by bombs. and make sure that you get most destructible blocks before your peers they drop gems that may open new paths.</li>
            <li><strong>Indestructible Blocks:</strong> Solid blocks cannot be destroyed. Use them for cover!</li>
        </ul>

        <h4>Power-Ups (Gems):</h4>
        <p>Collect these gems hidden in destructible blocks to gain an edge:</p>
        <ul>
            <li><strong style="color: #ff4444;">Red Gem (Flame Power):</strong> Increases the blast radius of your bombs, making your explosions reach further.</li>
            <li><strong style="color: #cc66ff;">Purple Gem (Speed Up):</strong> Increases your movement speed, allowing you to navigate the map faster.</li>
            <li><strong style="color: #33cc33;">Green Gem (Extra Bomb):</strong> Allows you to place an additional bomb at a time.</li>
        </ul>

        <p>Watch out for explosions – including your own! Good luck, and have fun!</p>
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Onto The Battlefield!';
    closeButton.style.display = 'block';
    closeButton.style.width = '200px';
    closeButton.style.padding = '12px 20px';
    closeButton.style.margin = '25px auto 0';
    closeButton.style.backgroundColor = '#61dafb';
    closeButton.style.color = '#1a1a20';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '1em';
    closeButton.style.fontWeight = 'bold';

    closeButton.onclick = function() {
        overlay.remove();
        localStorage.setItem('bomberman_visited', 'true');
    };

    popup.appendChild(title);
    popup.appendChild(content);
    popup.appendChild(closeButton);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

// Show the popup when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showWelcomePopup);
} else {
    showWelcomePopup();
}