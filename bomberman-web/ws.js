let socket = null;
let hasJoined = false;  // ✅ now it's local here

function connectWebSocket(nickname, playerId, onMessage) {
    socket = new WebSocket('ws://localhost:8080/ws');
    socket.onopen = () => {
        const msg = {
            type: 'join',
            playerId: playerId,
            payload: { nickname }  // ✅ already fixed
        };
        socket.send(JSON.stringify(msg));
    };

    socket.onmessage = (event) => {
        try {
            const messages = event.data.split('\n');
            for (const msg of messages) {
                if (!msg.trim()) continue;
                
                try {
                    const data = JSON.parse(msg);
                    
                    if (data.type === "join_ack") {
                        console.log("✅ Join acknowledged by server:", data.payload);
                        hasJoined = true;
                        continue;
                    }
                    
                    onMessage(data);
                } catch (e) {
                    console.error("Failed to parse WS message:", msg.substring(0, 100) + "...", e);
                }
            }
        } catch (error) {
            console.error("Error in onmessage handler:", error);
        }
    };

    socket.onclose = () => {
        hasJoined = false;
    };
}

function isJoined() {
    return hasJoined;
}

export { connectWebSocket, socket, isJoined };  // ✅ expose isJoined()
