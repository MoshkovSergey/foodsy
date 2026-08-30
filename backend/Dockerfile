# ── сборка ──
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download || true
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/foodsy-api ./cmd/server

# ── рантайм ──
FROM alpine:3.21
RUN adduser -D -u 10001 foodsy
USER foodsy
COPY --from=build /out/foodsy-api /usr/local/bin/foodsy-api
EXPOSE 8000
ENTRYPOINT ["foodsy-api"]
