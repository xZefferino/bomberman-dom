// WebSocket connection logic
let socket = null;

function connectWebSocket(nickname, onMessage) {
    socket = new WebSocket('ws://localhost:8080/ws'); // Adjust port if needed
    socket.onopen = () => {
        // The backend expects a Message with type, playerId, payload
        const msg = {
            type: 'join',
            playerId: '',
            payload: JSON.stringify({ nickname })
        };
        socket.send(JSON.stringify(msg));
    };
    socket.onmessage = (event) => {
        // Some servers send multiple JSON objects separated by newlines
        const messages = event.data.split('\n');
        for (const msg of messages) {
            if (!msg.trim()) continue;
            try {
                const data = JSON.parse(msg);
                onMessage(data);
            } catch (e) {
                // Ignore parse errors for empty lines or partial messages
            }
        }
    };
    socket.onclose = () => {
        // handle disconnect
    };
}

export { connectWebSocket, socket };
