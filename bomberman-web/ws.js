let socket = null; // Ensure socket is declared at the module level, initialized to null
let hasJoined = false;

function connectWebSocket(nickname, playerId, onMessage) {
    // If an old socket exists and is open or connecting, close it and clear handlers
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        console.log("Closing existing WebSocket connection before creating a new one.");
        // Nullify all handlers to prevent them from firing on the old socket instance
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null; // Important to prevent old onclose logic from interfering
        socket.close();
    }
    socket = null; // Ensure the old socket reference is cleared
    hasJoined = false; // Reset join status

    console.log(`Attempting to connect WebSocket for ${nickname} (${playerId})`);
    socket = new WebSocket('ws://localhost:8080/ws');

    socket.onopen = () => {
        console.log("WebSocket connection opened.");
        // hasJoined is false until join_ack
        const msg = {
            type: 'join',
            playerId: playerId,
            payload: { nickname }
        };
        console.log("Sending join message:", msg);
        socket.send(JSON.stringify(msg));
    };

    socket.onmessage = (event) => {
        try {
            const messages = event.data.split('\n');
            for (const rawMsg of messages) {
                if (!rawMsg.trim()) continue;
                
                try {
                    const data = JSON.parse(rawMsg);
                    // console.log("WebSocket message received:", data); // Log all messages for debugging
                    
                    if (data.type === "join_ack") {
                        console.log("✅ Join acknowledged by server:", data.payload);
                        hasJoined = true;
                        // Continue to call onMessage for join_ack if your main handler needs it,
                        // otherwise, you could 'continue;' here.
                    }
                    
                    onMessage(data); // Pass all parsed messages to the main handler
                } catch (e) {
                    console.error("Failed to parse individual WS message:", rawMsg.substring(0, 100) + "...", e);
                }
            }
        } catch (error) {
            console.error("Error in onmessage handler:", error);
        }
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        hasJoined = false;
        // Consider how to inform the main application, perhaps via onMessage with an error type
    };

    socket.onclose = (event) => {
        console.log("WebSocket connection closed.", event.code, event.reason);
        hasJoined = false;
        socket = null; // Crucial: nullify the socket so a fresh one is made next time
        // Consider how to inform the main application, perhaps via onMessage with a disconnect type
    };
}

function isJoined() {
    return hasJoined && socket && socket.readyState === WebSocket.OPEN;
}

// Export socket if it needs to be accessed directly for specific scenarios (e.g., sending messages),
// but generally, interactions should be through exported functions.
export { connectWebSocket, socket, isJoined };
