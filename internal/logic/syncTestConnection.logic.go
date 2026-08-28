package logic

import (
	generated "MultiMediaManager/internal/generated"
	"fmt"
	"time"

	"github.com/jlaffaye/ftp"
)

// SyncTestConnectionLogic
type SyncTestConnectionLogic struct {
	*Logic
}

func NewSyncTestConnectionLogic(l *Logic) *SyncTestConnectionLogic {
	return &SyncTestConnectionLogic{Logic: l}
}

// SyncTestConnection
func (l *SyncTestConnectionLogic) SyncTestConnection(req *generated.SyncTestConnectionRequest) (*generated.SyncTestConnectionResponse, error) {

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

	return &generated.SyncTestConnectionResponse{
		Code:    0,
		Message: "success",
	}, nil
}
