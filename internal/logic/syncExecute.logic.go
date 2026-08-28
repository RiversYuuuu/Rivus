package logic

import (
	generated "MultiMediaManager/internal/generated"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"time"

	"github.com/jlaffaye/ftp"
)

// SyncExecuteLogic
type SyncExecuteLogic struct {
	*Logic
}

func NewSyncExecuteLogic(l *Logic) *SyncExecuteLogic {
	return &SyncExecuteLogic{Logic: l}
}

// SyncExecute
func (l *SyncExecuteLogic) SyncExecute(req *generated.SyncExecuteRequest) (*generated.SyncExecuteResponse, error) {

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

	// 上传文件
	if req.ToUpload != nil && len(*req.ToUpload) > 0 {
		for _, filePath := range *req.ToUpload {
			err := func() error {
				localFile, err := os.Open(filePath)
				if err != nil {
					return err
				}
				defer localFile.Close()
				remotePath := path.Join(*req.Directory, filepath.Base(filePath))
				return conn.Stor(remotePath, localFile)
			}()
			if err != nil {
				return nil, err
			}
		}
	}

	// 下载文件
	if req.ToDownload != nil && len(*req.ToDownload) > 0 {
		config, err := l.Repo.GetConfig()
		if err != nil {
			return nil, err
		}
		audioDir := config.AudioDir

		for _, fileName := range *req.ToDownload {
			err := func() error {
				remotePath := path.Join(*req.Directory, fileName)
				reader, err := conn.Retr(remotePath)
				if err != nil {
					return err
				}
				defer reader.Close()
				localPath := filepath.Join(audioDir, fileName)
				localFile, err := os.Create(localPath)
				if err != nil {
					return err
				}
				defer localFile.Close()
				_, err = io.Copy(localFile, reader)
				if err != nil {
					return err
				}
				return nil
			}()
			if err != nil {
				return nil, err
			}
		}
	}

	return &generated.SyncExecuteResponse{
		Code:    0,
		Message: "success",
	}, nil
}
