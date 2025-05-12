# Contents of /bomberman-server/bomberman-server/README.md

# Bomberman Server

This is a backend server for a multiplayer Bomberman-like game built in Go. The server manages player connections, game state, and communication between clients using WebSockets.

## Features

- Player mechanics including movement and bomb placement
- Dynamic game map with destructible blocks and walls
- Power-ups that spawn when blocks are destroyed
- Real-time chat feature using WebSockets

## Project Structure

- **cmd/server/main.go**: Entry point of the application.
- **internal/game/**: Contains game logic including player, map, bomb, and power-up management.
- **internal/websocket/**: Manages WebSocket connections and messaging.
- **internal/server/**: Handles HTTP and WebSocket requests.
- **pkg/types/**: Common types and interfaces used throughout the game.
- **configs/config.yaml**: Configuration settings for the server.
- **go.mod**: Go module definition.
- **go.sum**: Dependency checksums.

## Setup Instructions

1. Clone the repository.
2. Navigate to the project directory.
3. Run `go mod tidy` to install dependencies.
4. Start the server with `go run cmd/server/main.go`.

## Gameplay

Players can connect to the server, join games, and interact with each other in real-time. The objective is to outsmart opponents by placing bombs and collecting power-ups while avoiding explosions.

## License

This project is licensed under the MIT License.