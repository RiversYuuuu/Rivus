package handler

import (
	"net/http"

	generated "Rivus/internal/generated"
	"Rivus/internal/logic"

	"github.com/gin-gonic/gin"
)

// GetImageSource 获取图片文件
func (h *Handler) GetImageSource(c *gin.Context, params generated.GetImageSourceParams) {
	l := logic.NewGetImageSourceLogic(h.Logic)

	filePath, mimeType, err := l.GetImageSource(params)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": err.Error()})
		return
	}

	c.Header("Content-Type", mimeType)
	c.File(filePath)
}
