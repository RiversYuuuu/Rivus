package handler

import (
	"net/http"

	generated "MultiMediaManager/internal/generated"
	"MultiMediaManager/internal/logic"

	"github.com/gin-gonic/gin"
)

// GetLyricSource 获取歌词
func (h *Handler) GetLyricSource(c *gin.Context, params generated.GetLyricSourceParams) {
	l := logic.NewGetLyricSourceLogic(h.Logic)

	content, err := l.GetLyricSource(params)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": err.Error()})
		return
	}

	c.Header("Content-Type", "text/plain; charset=utf-8")
	c.String(http.StatusOK, content)
}
