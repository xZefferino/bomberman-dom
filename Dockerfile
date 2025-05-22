<<<<<<< HEAD
# Stage 1: Build the Go application
FROM golang:1.22-alpine AS builder
WORKDIR /src

COPY bomberman-server/go.mod bomberman-server/go.sum ./

RUN go mod download


COPY bomberman-server/ ./


RUN CGO_ENABLED=0 GOOS=linux go build -v -o /app_output/server_app/server_binary ./cmd/server/main.go

FROM alpine:latest


WORKDIR /deploy

COPY bomberman-web/ ./bomberman-web/

COPY --from=builder /app_output/server_app/server_binary ./server_app/

EXPOSE 8080

=======
# Stage 1: Build the Go application
FROM golang:1.22-alpine AS builder
WORKDIR /src

COPY bomberman-server/go.mod bomberman-server/go.sum ./

RUN go mod download


COPY bomberman-server/ ./


RUN CGO_ENABLED=0 GOOS=linux go build -v -o /app_output/server_app/server_binary ./cmd/server/main.go

FROM alpine:latest


WORKDIR /deploy

COPY bomberman-web/ ./bomberman-web/

COPY --from=builder /app_output/server_app/server_binary ./server_app/

EXPOSE 8080

>>>>>>> 92a64c9a557d2c36bd0ae7d8c0bf469483a50379
CMD ["./server_app/server_binary"]