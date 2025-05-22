FROM golang:1.22-alpine AS builder
WORKDIR /src

COPY bomberman-server/go.mod bomberman-server/go.sum ./

RUN go mod download


COPY bomberman-server/ ./


RUN CGO_ENABLED=0 GOOS=linux go build -v -o /app_output/server_app/server_binary ./cmd/server/main.go

# Stage 2: Create the final lightweight image
FROM alpine:latest

WORKDIR /deploy

# Copy the static web assets
COPY bomberman-web/ ./bomberman-web/

# Copy the Go binary from the builder stage
COPY --from=builder /app_output/server_app/server_binary ./server_app/

EXPOSE 8080

# Command to run the application
CMD ["./server_app/server_binary"]