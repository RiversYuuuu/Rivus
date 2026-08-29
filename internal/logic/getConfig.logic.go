package logic

import (
	generated "Rivus/internal/generated"
)

type GetConfigLogic struct {
	*Logic
}

func NewGetConfigLogic(l *Logic) *GetConfigLogic {
	return &GetConfigLogic{Logic: l}
}

func (l *GetConfigLogic) GetConfig() (*generated.GetConfigResponse, error) {
	config, err := l.Repo.GetConfig()
	if err != nil {
		l.Logger.Warn("Failed to get config", "error", err)
	}

	resp := &generated.GetConfigResponse{
		Code:    0,
		Message: "success",
		Data: &generated.Config{
			AudioDir:       &config.AudioDir,
			AcoustidApiKey: &config.AcoustIDApiKey,
		},
	}

	return resp, nil
}
