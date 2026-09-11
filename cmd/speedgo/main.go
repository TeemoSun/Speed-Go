package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/TeemoSun/Speed-Go/internal/config"
	"github.com/TeemoSun/Speed-Go/internal/handlers"
	"github.com/TeemoSun/Speed-Go/internal/ip"
	"github.com/TeemoSun/Speed-Go/internal/storage"
	"github.com/TeemoSun/Speed-Go/web"
)

func main() {
	cfg := config.LoadConfig()

	log.Println("==================================================")
	log.Println("       SpeedGo 高性能网络测速系统启动中...        ")
	log.Println("==================================================")

	// 1. 初始化 SQLite 存储
	store, err := storage.NewStorage(cfg.DBPath)
	if err != nil {
		log.Fatalf("[致命错误] 数据库初始化失败: %v", err)
	}
	defer store.Close()
	log.Printf("[存储引擎] SQLite WAL 模式已就绪: %s", cfg.DBPath)

	// 2. 初始化 IP 地理与 ISP 解析器
	locator := ip.NewLocator(cfg.GeoCityPath, cfg.GeoASNPath)
	defer locator.Close()
	log.Printf("[网络引擎] 离线 IP 库解析器就绪")

	// 3. 初始化 HTTP Handler 与嵌入的前端 SPA
	embeddedFS := web.GetFileSystem()
	h := handlers.NewHandler(cfg, locator, store, embeddedFS)
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	// 包装全局中间件 (CORS, Cookie UUID 等)
	handlerWithMiddleware := h.Middleware(mux)

	server := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           handlerWithMiddleware,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// 优雅关机监听
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("[服务监听] 测速服务运行在: http://0.0.0.0:%d", cfg.Port)
		log.Printf("[CLI 测速] 终端使用指令: curl -sL http://localhost:%d/cli | bash", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[服务异常] %v", err)
		}
	}()

	<-stopChan
	log.Println("[系统通知] 接收到终止信号，正在平滑关闭服务...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("[关机警告] 强制终止连接: %v", err)
	}

	log.Println("[系统通知] SpeedGo 服务已安全退出。")
}
