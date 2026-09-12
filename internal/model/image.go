package model

import (
	"time"

	"gorm.io/gorm"
)

type Image struct {
	gorm.Model // ID, CreatedAt, UpdatedAt, DeletedAt

	// 文件基础信息
	FilePath string `gorm:"size:255;not null;comment:文件路径"`
	FileExt  string `gorm:"size:20;index;comment:文件格式"`
	FileSize int64  `gorm:"comment:文件字节大小"`
	MD5      string `gorm:"size:64;uniqueIndex;comment:文件哈希值"`

	// 图片信息
	Width  int `gorm:"comment:宽度（像素）"`
	Height int `gorm:"comment:高度（像素）"`

	// 拍摄信息
	ShotAt      *time.Time `gorm:"index;comment:拍摄时间"`
	Orientation int        `gorm:"comment:朝向（1-8，对应EXIF标准，用于自动转正）"`
	Latitude    float64    `gorm:"comment:纬度"`
	Longitude   float64    `gorm:"comment:经度"`
}

type SearchImageCondition struct {
	// 分页条件
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
	// 排序条件
	SortBy    string `json:"sortBy"`
	SortOrder string `json:"sortOrder"`
	// 搜索条件
	MD5 string `json:"md5"`
}
