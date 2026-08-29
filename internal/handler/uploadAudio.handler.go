package handler

import (
	"net/http"

	"Rivus/internal/logic"

	"github.com/gin-gonic/gin"
)

// UploadAudio 上传音频文件
func (h *Handler) UploadAudio(c *gin.Context) {
	l := logic.NewUploadAudioLogic(h.Logic)

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "未找到上传文件"})
		return
	}

	resp, err := l.UploadAudio(fileHeader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}
