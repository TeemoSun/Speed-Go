# syntax=docker/dockerfile:1

# ---- Stage 1: 前端静态资源构建 ----
FROM node:22-alpine AS frontend
WORKDIR /build
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
COPY web/package.json web/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY web/ ./
RUN npm run build

# ---- Stage 2: 离线 IP 归属地与 ASN 数据库获取 (打入镜像内置) ----
FROM alpine:3.20 AS geoip-fetcher
RUN apk add --no-cache curl ca-certificates && \
    mkdir -p /geoip && \
    echo "Downloading GeoLite2 databases into image..." && \
    curl -sSL --retry 3 --retry-delay 2 -o /geoip/GeoLite2-City.mmdb https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-City.mmdb && \
    curl -sSL --retry 3 --retry-delay 2 -o /geoip/GeoLite2-ASN.mmdb https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-ASN.mmdb

# ---- Stage 3: Go 后端纯静态编译 (CGO_ENABLED=0) ----
FROM golang:1.23-alpine AS backend-builder
WORKDIR /build
ENV GOPROXY=https://goproxy.cn,direct
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
COPY --from=frontend /build/dist ./web/dist
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -buildvcs=false -trimpath -ldflags="-s -w" -o /build/speedgo ./cmd/speedgo

# ---- Stage 4: 极简生产运行时 (内置二进制与离线 IP 库，无需外部额外挂载) ----
FROM alpine:3.20 AS runtime
ENV TZ=Asia/Shanghai

RUN apk add --no-cache tzdata ca-certificates && \
    addgroup -g 1000 -S appuser && \
    adduser -u 1000 -S appuser -G appuser && \
    mkdir -p /data /app /app/geoip && \
    chown -R appuser:appuser /data /app

WORKDIR /app

# 从构建阶段拷入静态单一二进制文件与内置离线 GeoIP 数据库
COPY --from=backend-builder --chown=appuser:appuser /build/speedgo /app/speedgo
COPY --from=geoip-fetcher --chown=appuser:appuser /geoip/GeoLite2-City.mmdb /app/geoip/GeoLite2-City.mmdb
COPY --from=geoip-fetcher --chown=appuser:appuser /geoip/GeoLite2-ASN.mmdb /app/geoip/GeoLite2-ASN.mmdb

USER appuser
EXPOSE 8080
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["/app/speedgo", "-healthcheck"]

CMD ["/app/speedgo", "--port", "8080", "--db", "/data/speedgo.db"]
