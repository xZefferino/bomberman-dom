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
        const data = JSON.parse(event.data);
        onMessage(data);
    };
    socket.onclose = () => {
        // handle disconnect
    };
}

export { connectWebSocket, socket };
