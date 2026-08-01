package logic

import (
	generated "MultiMediaManager/internal/generated"
)

// GetConfigLogic 获取配置接口
type GetConfigLogic struct {
	*Logic
}

func NewGetConfigLogic(l *Logic) *GetConfigLogic {
	return &GetConfigLogic{Logic: l}
}

// GetConfig 获取配置接口
func (l *GetConfigLogic) GetConfig() (*generated.GetConfigResponse, error) {
	// 读取配置
	config, err := l.Repo.GetConfig()
	if err != nil {
		l.Logger.Warn("Failed to get config", "error", err)
	}

	// 转换为响应
	resp := &generated.GetConfigResponse{
		Code:    0,
		Message: "success",
		Data: &generated.Config{
			AudioDir: &config.AudioDir,
		},
	}

	return resp, nil
}
