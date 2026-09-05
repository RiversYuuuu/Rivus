// main.go
package main

import (
	"log/slog"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"

	generated "Rivus/internal/generated"
	"Rivus/internal/handler"
	"Rivus/internal/logic"
	"Rivus/internal/repository"
)

func main() {
	// 获取用户主目录路径
	homeDir, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}

	// 创建数据目录
	dataDir := filepath.Join(homeDir, ".Rivus")
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

	r.GET("/", func(c *gin.Context) {
		c.File("./dist/assets/html/index.html")
	})
	r.GET("/audiopage/console", func(c *gin.Context) {
		c.File("./dist/assets/html/audiopage/console.html")
	})
	r.GET("/audiopage/setting", func(c *gin.Context) {
		c.File("./dist/assets/html/audiopage/setting.html")
	})
	r.GET("/imagepage/setting", func(c *gin.Context) {
		c.File("./dist/assets/html/imagepage/setting.html")
	})
	r.GET("/imagepage/console", func(c *gin.Context) {
		c.File("./dist/assets/html/imagepage/console.html")
	})

	r.NoRoute(func(c *gin.Context) {
		c.Redirect(302, "/")
	})

	logger.Info("服务启动", "port", ":8080")
	r.Run(":8080")
}
