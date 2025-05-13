import { h, render } from '../../framework/index.js';
import { attachEvents } from '../../framework/events.js';
import { createState, getState, setState, subscribe } from '../../framework/state.js';
import { defineRoutes, startRouter, navigate } from '../../framework/router.js';
import { GameLoop } from './game-loop.js';
import { InputManager } from './input-manager.js';
import { WSClient } from './ws-client.js';
import { LoginScreen } from './screens/login.js';
import { WaitingScreen } from './screens/waiting.js';
import { GameScreen } from './screens/game.js';

// Initialize state
createState({
    screen: 'login',
    playerID: null,
    playerName: '',
    gameState: null,
    players: {},
    bombs: {},
    powerUps: {},
    countdown: null,
    chatMessages: [],
    isChatOpen: true,
    lastActionTime: {},  // To throttle actions
    actionThrottle: {    // Milliseconds between actions
        move: 100,       // 100ms between movements (10 per second)
        bomb: 500        // 500ms between bomb placements (2 per second)
    }
});

// Define routes
defineRoutes({
    '/': () => renderCurrentScreen(),
    '/login': () => {
        setState({ screen: 'login' });
        return renderCurrentScreen();
    },
    '/waiting': () => {
        setState({ screen: 'waiting' });
        return renderCurrentScreen();
    },
    '/game': () => {
        setState({ screen: 'game' });
        return renderCurrentScreen();
    }
});

// WebSocket connection
const ws = new WSClient('ws://localhost:8080/ws');
console.log("WebSocket client created with URL: ws://localhost:8080/ws");
// Make it available globally for components
window.wsClient = ws;

// Input manager for keyboard controls
const input = new InputManager();

// Game loop for animation and input handling
let gameLoop = null;

// Main rendering function
function renderCurrentScreen() {
    const state = getState();
    
    switch(state.screen) {
        case 'login':
            return LoginScreen(handleLogin);
        case 'waiting':
            return WaitingScreen(state);
        case 'game':
            return GameScreen(state, input);
        default:
            return LoginScreen(handleLogin);
    }
}

// Handle login submit
function handleLogin(nickname) {
    console.log("Attempting to join game with nickname:", nickname);
    
    fetch('http://localhost:8080/api/game/join', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nickname })
    })
    .then(res => {
        console.log("Response status:", res.status);
        if (!res.ok) {
            return res.text().then(text => {
                console.error("Error response:", text);
                throw new Error(`HTTP error ${res.status}: ${text}`);
            });
        }
        return res.json();
    })
    .then(data => {
        console.log("Join successful:", data);
        setState({
            playerID: data.playerID,
            playerName: nickname,
            screen: 'waiting'
        });
        
        // Send join message to websocket
        ws.send('join', {
            nickname: nickname,
            playerID: data.playerID
        });
        
        navigate('/waiting');
    })
    .catch(err => {
        console.error('Error joining game:', err);
        alert('Failed to join game. Please try again.');
    });
}

// Start the router
const rootElement = document.getElementById('app');
startRouter(rootElement, (vnode, container) => {
    render(vnode, container);
    attachEvents(container);
});

// Initialize game loop
gameLoop = new GameLoop(
    (delta) => updateGame(delta),
    () => {} // No direct rendering here, we use the framework's rendering
);
gameLoop.start();

// WebSocket message handlers
ws.on('gameState', (data) => {
    setState({
        gameState: data.state.state,
        players: data.state.players,
        bombs: data.state.bombs,
        powerUps: data.state.powerUps,
        countdown: data.state.countdown || null
    });
    
    // Auto-transition to game screen when game starts
    if (data.state.state >= 2 && getState().screen === 'waiting') {
        setState({ screen: 'game' });
        navigate('/game');
    }
});

ws.on('chat', (data) => {
    const messages = [...getState().chatMessages, {
        playerID: data.playerID,
        playerName: data.playerName,
        message: data.message,
        timestamp: data.timestamp
    }];
    
    setState({
        chatMessages: messages.slice(-20) // Keep last 20 messages
    });
});

// Game update function (called by game loop)
function updateGame(delta) {
    // Update input manager
    input.update();
    
    const state = getState();
    const now = Date.now();
    
    // Only handle input when the game is running
    if (state.gameState === 2 && state.playerID) { // GameRunning
        const lastActionTime = state.lastActionTime || {};
        const throttle = state.actionThrottle || {};
        
        // Movement
        let actionSent = false;
        
        if (input.isKeyPressed('ArrowUp') && canPerformAction('move_up', now, lastActionTime, throttle)) {
            ws.send('action', { playerID: state.playerID, action: 'move_up' });
            actionSent = true;
            lastActionTime.move_up = now;
        }
        else if (input.isKeyPressed('ArrowDown') && canPerformAction('move_down', now, lastActionTime, throttle)) {
            ws.send('action', { playerID: state.playerID, action: 'move_down' });
            actionSent = true;
            lastActionTime.move_down = now;
        }
        else if (input.isKeyPressed('ArrowLeft') && canPerformAction('move_left', now, lastActionTime, throttle)) {
            ws.send('action', { playerID: state.playerID, action: 'move_left' });
            actionSent = true;
            lastActionTime.move_left = now;
        }
        else if (input.isKeyPressed('ArrowRight') && canPerformAction('move_right', now, lastActionTime, throttle)) {
            ws.send('action', { playerID: state.playerID, action: 'move_right' });
            actionSent = true;
            lastActionTime.move_right = now;
        }
        
        // Bomb placement - use either Space or Enter
        if ((input.isKeyPressed('Space') || input.isKeyPressed('Enter')) && 
            canPerformAction('place_bomb', now, lastActionTime, throttle)) {
            ws.send('action', { playerID: state.playerID, action: 'place_bomb' });
            lastActionTime.place_bomb = now;
            actionSent = true;
        }
        
        // If we sent an action, update the lastActionTime state
        if (actionSent) {
            setState({ lastActionTime });
        }
    }
}

// Helper to throttle actions
function canPerformAction(actionType, now, lastActionTime, throttle) {
    const moveActions = ['move_up', 'move_down', 'move_left', 'move_right'];
    const actionCategory = moveActions.includes(actionType) ? 'move' : 'bomb';
    const last = lastActionTime[actionType] || 0;
    return (now - last) >= throttle[actionCategory];
}

// Add a subscription to re-render when state changes
subscribe(() => {
    if (rootElement) {
        render(renderCurrentScreen(), rootElement);
        attachEvents(rootElement);
    }
});

// Listen for game state updates
setInterval(() => {
    fetch('http://localhost:8080/api/game/status')
        .then(res => res.json())
        .then(data => {
            if (data.state !== getState().gameState) {
                setState({ gameState: data.state });
            }
        })
        .catch(err => {
            console.error("Error fetching game status:", err);
        });
}, 3000);