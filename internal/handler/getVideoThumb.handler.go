package handler

import (
	"net/http"

	generated "Rivus/internal/generated"
	"Rivus/internal/logic"

	"github.com/gin-gonic/gin"
)

// GetVideoThumb 获取视频缩略图
func (h *Handler) GetVideoThumb(c *gin.Context, params generated.GetVideoThumbParams) {
	l := logic.NewGetVideoThumbLogic(h.Logic)

	filePath, mimeType, err := l.GetVideoThumb(params)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": err.Error()})
		return
	}

	c.Header("Content-Type", mimeType)
	c.File(filePath)
}
