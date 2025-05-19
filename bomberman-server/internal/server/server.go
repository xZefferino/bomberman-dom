package server

import (
    // "log"
    "net/http"
    "sync"

    "bomberman-server/internal/game"
    "bomberman-server/internal/websocket"

    "github.com/gorilla/mux"
)

// Server represents the game server
type Server struct {
    Router    *mux.Router
    Game      *game.Game
    Hub       *websocket.Hub
    mutex     sync.Mutex
}

// NewServer creates a new server instance
func NewServer() *Server {
    gameInstance := game.NewGame()
    
    server := &Server{
        Router:    mux.NewRouter(),
        Game:      gameInstance,
        Hub:       websocket.NewHub(gameInstance),
    }

    return server
}

// SetupRoutes configures the server routes
func (s *Server) SetupRoutes() {
    // Add CORS middleware
    s.Router.Use(func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.Header().Set("Access-Control-Allow-Origin", "*")
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
            
            if r.Method == "OPTIONS" {
                w.WriteHeader(http.StatusOK)
                return
            }
            
            next.ServeHTTP(w, r)
        })
    })
    
    // Existing routes
    s.Router.HandleFunc("/ws", s.handleWebSocket)
    s.Router.HandleFunc("/api/game/join", s.handleJoinGame).Methods("POST")
    s.Router.HandleFunc("/api/game/status", s.handleGameStatus).Methods("GET")

    
    // Serve static files
    s.Router.PathPrefix("/").Handler(http.FileServer(http.Dir("./bomberman-web/")))
}

// StartWebSocketHub starts the WebSocket hub
func (s *Server) StartWebSocketHub() {
    s.Hub.Run()
}