// main.go
package main

import (
	"fmt"
	"log/slog"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"github.com/gin-gonic/gin"

	generated "Rivus/internal/generated"
	"Rivus/internal/handler"
	"Rivus/internal/logic"
	"Rivus/internal/repository"
)

func main() {
	addr := "localhost:8080"

	conn, err := net.Dial("tcp", addr)
	if err == nil {
		conn.Close()
		openBrowser("http://" + addr)
		fmt.Println("Rivus 已在运行，直接打开浏览器")
		return
	}

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
	openBrowser("http://" + addr)
	r.Run(":8080")
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	cmd.Start()
}
