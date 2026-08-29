package logic

import (
	generated "Rivus/internal/generated"
	"fmt"
	"time"

	"github.com/jlaffaye/ftp"
)

// SyncBrowseLogic
type SyncBrowseLogic struct {
	*Logic
}

func NewSyncBrowseLogic(l *Logic) *SyncBrowseLogic {
	return &SyncBrowseLogic{Logic: l}
}

// SyncBrowse
func (l *SyncBrowseLogic) SyncBrowse(params generated.SyncBrowseParams) (*generated.SyncBrowseResponse, error) {

	// 连接FTP服务器
	conn, err := ftp.Dial(
		fmt.Sprintf("%s:%d", *params.Ip, *params.Port),
		ftp.DialWithTimeout(5*time.Second),
	)
	if err != nil {
		return nil, err
	}

	// 登录FTP服务器
	err = conn.Login(*params.Username, *params.Password)
	if err != nil {
		return nil, err
	}

	// 获取目录列表
	entries, err := conn.List(*params.Directory)
	if err != nil {
		return nil, err
	}

	// 转换为生成的响应
	dirs := make([]string, 0)
	for _, entry := range entries {
		if entry.Type == ftp.EntryTypeFolder {
			dirs = append(dirs, entry.Name)
		}
	}

	return &generated.SyncBrowseResponse{
		Code:    0,
		Message: "success",
		Data: &struct {
			Dirs *[]string `json:"dirs,omitempty"`
		}{
			Dirs: &dirs,
		},
	}, nil
}
