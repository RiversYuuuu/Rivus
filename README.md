# Rivus

Rivus 是一个本地音频文件管理系统，提供音频元数据的扫描、搜索、编辑与播放功能，附带 Web 前端界面。

## 功能

- 音频目录扫描，自动提取文件元数据（标题、艺术家、专辑等）
- 按标题/艺术家搜索，支持分页与排序
- 音频元数据编辑
- 音频文件上传与流式播放
- 歌词文件上传与查看
- 软删除与回收站，支持恢复或永久删除
- 服务配置管理（音频存储目录等）

## 技术栈

- 后端：Go 1.26 / Gin / GORM / SQLite
- 前端：HTML + CSS + JavaScript（位于 `dist/`）
- API 定义：OpenAPI 3.0（`docs/openapi.yaml`）
- 代码生成：oapi-codegen（类型与接口）+ 自定义 codegen（handler/logic 脚手架）

## 项目结构

```
Rivus/
├── main.go                  # 程序入口，启动 HTTP 服务
├── docs/
│   └── openapi.yaml         # OpenAPI 3.0 接口定义
├── internal/
│   ├── generated/           # oapi-codegen 生成的类型与接口
│   ├── handler/             # 请求处理层
│   ├── logic/               # 业务逻辑层
│   ├── model/               # 数据模型
│   ├── repository/          # 数据访问层
│   └── tool/                # 工具函数
├── dist/                    # 前端静态资源
├── tools/
│   └── codegen/             # 自定义代码生成器
└── Makefile                 # 构建与代码生成命令
```

## 快速开始

### 前置依赖

- Go 1.26+
- [oapi-codegen](https://github.com/oapi-codegen/oapi-codegen)
- [goimports](https://pkg.go.dev/golang.org/x/tools/cmd/goimports)

### 运行

```bash
make run
```

服务默认监听 `http://localhost:8080`，数据存储在 `~/.MultiMediaManager/` 目录下。

### 代码生成

从 OpenAPI 定义重新生成代码：

```bash
make gen
```

单独生成各层：

```bash
make gen-type      # 生成类型定义
make gen-server    # 生成 Gin 服务接口
make gen-handler   # 生成 handler 脚手架
make gen-logic     # 生成 logic 脚手架
```

## API 概览

| 方法   | 路径                    | 说明           |
| ------ | ----------------------- | -------------- |
| GET    | /ping                   | 健康检查       |
| GET    | /config                 | 获取配置       |
| POST   | /config                 | 设置配置       |
| GET    | /audio/scan             | 扫描音频目录   |
| GET    | /audio/search           | 搜索音频       |
| POST   | /audio/update           | 更新音频元数据 |
| DELETE | /audio/delete           | 删除音频       |
| POST   | /audio/restore          | 恢复音频       |
| GET    | /audio/recyclebin       | 获取回收站列表 |
| GET    | /audio/source           | 获取音频流     |
| POST   | /audio/upload           | 上传音频文件   |
| GET    | /audio/lyric/source     | 获取歌词       |
| POST   | /audio/lyric/upload     | 上传歌词文件   |

完整接口定义参见 [docs/openapi.yaml](docs/openapi.yaml)。