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

func runHealthCheck(port int) {
	client := &http.Client{Timeout: 3 * time.Second}
	url := fmt.Sprintf("http://127.0.0.1:%d/api/ip", port)

	resp, err := client.Get(url)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Health check probe failed: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "Health check probe returned status: %d\n", resp.StatusCode)
		os.Exit(1)
	}
	os.Exit(0)
}

// startRetentionLoop 按保留策略清理历史测速记录：启动时立即执行一次，
// 之后每小时执行一次；ctx 取消时退出。maxDays / maxRecords 任一非正数
// 表示跳过对应的清理条件。
func startRetentionLoop(ctx context.Context, store *storage.Storage, maxDays, maxRecords int) {
	prune := func(trigger string) {
		removed, err := store.PruneRecords(maxDays, maxRecords)
		if err != nil {
			log.Printf("[历史清理] 清理失败 (%s): %v", trigger, err)
			return
		}
		if removed > 0 {
			log.Printf("[历史清理] 已按保留策略删除 %d 条历史记录 (%s)", removed, trigger)
		}
	}

	prune("启动清理")
	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			prune("周期清理")
		case <-ctx.Done():
			return
		}
	}
}

func main() {
	cfg := config.LoadConfig()

	// 容器健康检查快速探针分支
	if cfg.Healthcheck {
		runHealthCheck(cfg.Port)
	}

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

	// 1.5 启动历史记录保留策略清理协程 (启动时执行一次，之后每小时清理)
	pruneCtx, pruneCancel := context.WithCancel(context.Background())
	defer pruneCancel()
	go startRetentionLoop(pruneCtx, store, cfg.HistoryMaxDays, cfg.HistoryMaxRecords)
	if cfg.HistoryMaxDays > 0 {
		log.Printf("[历史保留] 自动删除 %d 天前的测速记录", cfg.HistoryMaxDays)
	} else {
		log.Println("[历史保留] 未启用按天清理 (HistoryMaxDays=0)")
	}
	if cfg.HistoryMaxRecords > 0 {
		log.Printf("[历史保留] 仅保留最近 %d 条测速记录", cfg.HistoryMaxRecords)
	} else {
		log.Println("[历史保留] 不限制历史记录条数 (HistoryMaxRecords=0)")
	}

	// 2. 初始化 IP 地理与 ISP 解析器
	locator := ip.NewLocator(cfg.GeoCityPath, cfg.GeoASNPath)
	defer locator.Close()
	log.Printf("[网络引擎] 离线 IP 库解析器就绪 (City: %s, ASN: %s)", cfg.GeoCityPath, cfg.GeoASNPath)

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
		if cfg.PublicURL != "" {
			log.Printf("[外部地址] 公网访问基地址: %s", cfg.PublicURL)
		}
		log.Printf("[网络安全] 反向代理标头信任 (TrustProxy): %v", cfg.TrustProxy)
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
