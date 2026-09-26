package logic

import (
	generated "Rivus/internal/generated"
	"os"
)

// ShutdownLogic 关闭服务
type ShutdownLogic struct {
	*Logic
}

func NewShutdownLogic(l *Logic) *ShutdownLogic {
	return &ShutdownLogic{Logic: l}
}

// Shutdown 关闭服务
func (l *ShutdownLogic) Shutdown() (*generated.ShutdownResponse, error) {

	// TODO 通过回调实现
	os.Exit(0)

	return &generated.ShutdownResponse{}, nil
}
