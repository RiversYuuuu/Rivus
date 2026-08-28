package logic

import (
	generated "MultiMediaManager/internal/generated"
	"os"
	"path/filepath"
	"runtime"
)

// BrowseLogic 浏览本地目录
type BrowseLogic struct {
	*Logic
}

func NewBrowseLogic(l *Logic) *BrowseLogic {
	return &BrowseLogic{Logic: l}
}

// Browse 浏览本地目录
func (l *BrowseLogic) Browse(params generated.BrowseParams) (*generated.BrowseResponse, error) {
	// 获取传入的目录路径
	path := ""
	if params.Directory != nil {
		path = *params.Directory
	}

	separator := string(os.PathSeparator)

	// 处理空路径
	if path == "" || path == "/" || path == "\\" || path == "\\\\" {
		if runtime.GOOS == "windows" {
			// 获取所有盘符
			dirs := make([]string, 0)
			for i := range 26 {
				driveLetter := string(rune('A' + i))
				drivePath := driveLetter + ":\\"
				if _, err := os.Stat(drivePath); err == nil {
					dirs = append(dirs, drivePath)
				}
			}
			return &generated.BrowseResponse{
				Code:    0,
				Message: "success",
				Data: &struct {
					Dirs      *[]string `json:"dirs,omitempty"`
					Separator *string   `json:"separator,omitempty"`
				}{
					Dirs:      &dirs,
					Separator: &separator,
				},
			}, nil
		} else {
			path = "/"
		}
	}

	// 读取目录
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	dirs := make([]string, 0)
	for _, entry := range entries {
		if entry.IsDir() {
			// 返回完整路径
			dirs = append(dirs, filepath.Join(path, entry.Name()))
		}
	}

	return &generated.BrowseResponse{
		Code:    0,
		Message: "success",
		Data: &struct {
			Dirs      *[]string `json:"dirs,omitempty"`
			Separator *string   `json:"separator,omitempty"`
		}{
			Dirs:      &dirs,
			Separator: &separator,
		},
	}, nil
}
