package model

import "gorm.io/gorm"

type Audio struct {
	gorm.Model // ID, CreatedAt, UpdatedAt, DeletedAt

	// 文件基础信息
	FilePath string `gorm:"size:255;not null;comment:文件路径"`
	FileExt  string `gorm:"size:20;index;comment:文件格式"`
	FileSize int64  `gorm:"comment:文件字节大小"`
	MD5      string `gorm:"size:64;uniqueIndex;comment:文件哈希值"`

	// 标签信息
	Title    string  `gorm:"size:255;index;comment:歌曲标题"`
	Artist   string  `gorm:"size:255;index;comment:歌手"`
	Album    string  `gorm:"size:255;index;comment:专辑"`
	Duration float64 `gorm:"comment:时长（秒）"`

	// 关联文件路径
	CoverPath string `gorm:"size:255;comment:专辑封面"`
	LyricPath string `gorm:"size:255;comment:歌曲歌词"`
}

type SearchAudioCondition struct {
	// 分页条件
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
	// 排序条件
	SortBy    string `json:"sortBy"`
	SortOrder string `json:"sortOrder"`
	// 搜索条件
	Title  string `json:"title"`
	Artist string `json:"artist"`
	Album  string `json:"album"`
	MD5    string `json:"md5"`
}
