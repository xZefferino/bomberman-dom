package main

import (
    "log"
    "net/http"

    "bomberman-server/internal/server"
)

func main() {
    // Initialize the server
    srv := server.NewServer()

    // Set up routes
    srv.SetupRoutes()

    // Start the WebSocket hub
    go srv.StartWebSocketHub()

    // Start the HTTP server
    log.Println("Starting server on :8080")
    if err := http.ListenAndServe(":8080", srv.Router); err != nil {
        log.Fatalf("Could not start server: %s\n", err)
    }
}