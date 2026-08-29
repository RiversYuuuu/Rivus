package logic

import (
	generated "Rivus/internal/generated"
	"fmt"
	"path/filepath"
	"time"

	"github.com/jlaffaye/ftp"
)

// SyncCompareLogic
type SyncCompareLogic struct {
	*Logic
}

func NewSyncCompareLogic(l *Logic) *SyncCompareLogic {
	return &SyncCompareLogic{Logic: l}
}

// SyncCompare
func (l *SyncCompareLogic) SyncCompare(req *generated.SyncCompareRequest) (*generated.SyncCompareResponse, error) {

	// 连接FTP服务器
	conn, err := ftp.Dial(
		fmt.Sprintf("%s:%d", *req.Ip, *req.Port),
		ftp.DialWithTimeout(5*time.Second),
	)
	if err != nil {
		return nil, err
	}

	// 登录FTP服务器
	err = conn.Login(*req.Username, *req.Password)
	if err != nil {
		return nil, err
	}

	// 获取ftp目录列表
	entries, err := conn.List(*req.Directory)
	if err != nil {
		return nil, err
	}

	// 获取本地音频文件列表
	audios, err := l.Repo.GetAllAudio()
	if err != nil {
		return nil, err
	}
	localMap := make(map[string]string)
	for _, audio := range audios {
		localMap[filepath.Base(audio.FilePath)] = audio.FilePath
	}

	// 获取ftp音频文件列表
	remoteMap := make(map[string]struct{})
	for _, entry := range entries {
		if entry.Type == ftp.EntryTypeFolder {
			continue
		}
		if entry.Type == ftp.EntryTypeFile {
			remoteMap[entry.Name] = struct{}{}
		}
	}

	// 对比本地和ftp音频文件列表
	toDownload := make([]string, 0)
	toUpload := make([]string, 0)
	conflict := make([]string, 0)
	unchanged := 0

	for fileName, filePath := range localMap {
		if _, ok := remoteMap[fileName]; !ok {
			toUpload = append(toUpload, filePath)
		} else {
			unchanged++
		}
	}

	for fileName := range remoteMap {
		if _, ok := localMap[fileName]; !ok {
			toDownload = append(toDownload, fileName)
		}
	}

	return &generated.SyncCompareResponse{
		Code:    0,
		Message: "success",
		Data: &struct {
			Conflict   *[]string `json:"conflict,omitempty"`
			ToDownload *[]string `json:"to_download,omitempty"`
			ToUpload   *[]string `json:"to_upload,omitempty"`
			Unchanged  *int      `json:"unchanged,omitempty"`
		}{
			Conflict:   &conflict,
			ToDownload: &toDownload,
			ToUpload:   &toUpload,
			Unchanged:  &unchanged,
		},
	}, nil
}
