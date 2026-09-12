package handler

import (
	"net/http"

	generated "Rivus/internal/generated"
	"Rivus/internal/logic"

	"github.com/gin-gonic/gin"
)

// GetImageThumb 获取图片缩略图
func (h *Handler) GetImageThumb(c *gin.Context, params generated.GetImageThumbParams) {
	l := logic.NewGetImageThumbLogic(h.Logic)

	filePath, mimeType, err := l.GetImageThumb(params)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": err.Error()})
		return
	}

	c.Header("Content-Type", mimeType)
	c.File(filePath)
}
