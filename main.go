// main.go
package main

import (
	"log/slog"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"

	generated "MultiMediaManager/internal/generated"
	"MultiMediaManager/internal/handler"
	"MultiMediaManager/internal/logic"
	"MultiMediaManager/internal/repository"
)

func main() {
	// 获取用户主目录路径
	homeDir, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}

	// 创建数据目录
	dataDir := filepath.Join(homeDir, ".MultiMediaManager")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		panic(err)
	}

	// 初始化日志记录器
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))

	// 初始化数据库文件
	dbPath := filepath.Join(dataDir, "data.db")
	repo, err := repository.NewRepository(dbPath)
	if err != nil {
		panic(err)
	}

	// 创建逻辑层
	l := logic.NewLogic(repo, logger)

	// 创建处理层
	server := handler.NewHandler(l)

	r := gin.Default()

	r.Static("/assets", "./dist/assets")

	generated.RegisterHandlers(r, server)

	r.NoRoute(func(c *gin.Context) {
		c.File("./dist/index.html")
	})

	logger.Info("服务启动", "port", ":8080")
	r.Run(":8080")
}
