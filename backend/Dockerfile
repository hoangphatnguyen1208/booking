FROM golang:1.26-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -o /out/server ./src && CGO_ENABLED=0 go build -trimpath -o /out/admin ./cmd/admin && CGO_ENABLED=0 go build -trimpath -o /out/seed ./cmd/seed && CGO_ENABLED=0 go build -trimpath -o /out/bootstrap ./cmd/bootstrap
FROM alpine:3.23
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 booking
WORKDIR /app
COPY --from=build /out/server /out/admin /out/seed /out/bootstrap ./
USER booking
EXPOSE 8080
ENTRYPOINT ["/app/server"]
