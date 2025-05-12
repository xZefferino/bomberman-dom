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
    s.Router.HandleFunc("/ws", s.handleWebSocket)
    s.Router.HandleFunc("/api/game/join", s.handleJoinGame).Methods("POST")
    s.Router.HandleFunc("/api/game/status", s.handleGameStatus).Methods("GET")
    
    // Serve static files
    s.Router.PathPrefix("/").Handler(http.FileServer(http.Dir("./static")))
}

// StartWebSocketHub starts the WebSocket hub
func (s *Server) StartWebSocketHub() {
    s.Hub.Run()
}