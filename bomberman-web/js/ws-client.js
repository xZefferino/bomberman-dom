export class WSClient {
    constructor(url) {
        this.url = url;
        this.messageHandlers = new Map();
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.connect();
    }

    connect() {
        try {
            console.log("Connecting to WebSocket:", this.url);
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
            };
            
            this.ws.onmessage = (event) => this.handleMessage(event);
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                
                // Exponential backoff for reconnection attempts
                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
                this.reconnectAttempts++;
                
                console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
                setTimeout(() => this.connect(), delay);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
            setTimeout(() => this.connect(), 2000);
        }
    }

    on(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    send(type, data) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            console.log("Sending message:", type, data);
            this.ws.send(JSON.stringify({ 
                type, 
                playerID: data.playerID || null, 
                payload: data 
            }));
        } else {
            console.warn('WebSocket not connected, message not sent');
        }
    }

    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log("Received message:", message);
            if (message && message.type && this.messageHandlers.has(message.type)) {
                this.messageHandlers.get(message.type)(message);
            }
        } catch (err) {
            console.error('Error parsing WebSocket message:', err);
        }
    }
}