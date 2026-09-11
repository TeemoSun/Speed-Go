# 多阶段构建
FROM golang:1.23-alpine AS builder

WORKDIR /build
COPY . .

# 编译纯静态单一二进制
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o speedgo ./cmd/speedgo

# 极简运行镜像
FROM alpine:3.20

WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /build/speedgo /app/speedgo

VOLUME ["/app/data"]
EXPOSE 8080

ENTRYPOINT ["/app/speedgo"]
CMD ["--port", "8080", "--db", "/app/data/speedgo.db"]
