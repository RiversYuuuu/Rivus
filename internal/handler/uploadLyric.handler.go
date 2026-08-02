package handler

import (
	"net/http"
	"strconv"

	"MultiMediaManager/internal/logic"

	"github.com/gin-gonic/gin"
)

// UploadLyric 上传歌词文件
func (h *Handler) UploadLyric(c *gin.Context) {
	l := logic.NewUploadLyricLogic(h.Logic)

	id, err := strconv.ParseUint(c.PostForm("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的音频ID"})
		return
	}
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "未找到上传文件"})
		return
	}

	resp, err := l.UploadLyric(uint(id), fileHeader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}
