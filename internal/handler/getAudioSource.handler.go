package handler

import (
	"net/http"

	generated "Rivus/internal/generated"
	"Rivus/internal/logic"

	"github.com/gin-gonic/gin"
)

// GetAudioSource 获取音频文件
func (h *Handler) GetAudioSource(c *gin.Context, params generated.GetAudioSourceParams) {
	l := logic.NewGetAudioSourceLogic(h.Logic)

	filePath, mimeType, err := l.GetAudioSource(params)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": err.Error()})
		return
	}

	c.Header("Content-Type", mimeType)
	c.File(filePath)
}
