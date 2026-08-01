package logic

import (
	"MultiMediaManager/internal/repository"
	"log/slog"
)

type Logic struct {
	Repo   *repository.Repository
	Logger *slog.Logger
}

func NewLogic(repo *repository.Repository, logger *slog.Logger) *Logic {
	return &Logic{Repo: repo, Logger: logger}
}
