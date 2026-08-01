package logic

import (
	generated "MultiMediaManager/internal/generated"
)

// PingLogic 健康检查接口
type PingLogic struct {
	*Logic
}

func NewPingLogic(l *Logic) *PingLogic {
	return &PingLogic{Logic: l}
}

// Ping 健康检查接口
func (l *PingLogic) Ping() (*generated.PingResponse, error) {
	return &generated.PingResponse{Code: 0, Message: "success"}, nil
}
