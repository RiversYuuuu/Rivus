package handler

import (
	"net/http"

	generated "Rivus/internal/generated"
	"Rivus/internal/logic"

	"github.com/gin-gonic/gin"
)

// GetVideoSource 获取视频文件
func (h *Handler) GetVideoSource(c *gin.Context, params generated.GetVideoSourceParams) {
	l := logic.NewGetVideoSourceLogic(h.Logic)

	filePath, mimeType, err := l.GetVideoSource(params)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": err.Error()})
		return
	}

	c.Header("Content-Type", mimeType)
	c.File(filePath)
}
