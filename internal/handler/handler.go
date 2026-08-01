package handler

import "MultiMediaManager/internal/logic"

type Handler struct {
	Logic *logic.Logic
}

func NewHandler(l *logic.Logic) *Handler {
	return &Handler{Logic: l}
}
