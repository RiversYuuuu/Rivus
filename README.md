# Rivus

Rivus（流集）是一个本地多媒体文件管理系统，支持音频、图片、视频的扫描、搜索、浏览与元数据管理，附带 Web 前端界面。

## 功能

- **音频**：目录扫描自动提取元数据（标题、艺术家、专辑、时长），支持搜索、编辑、上传、流式播放
- **歌词**：歌词文件上传与查看，支持通过 LRCLIB 在线拉取时间同步歌词（LRC）
- **音频刮削**：通过 AcoustID + MusicBrainz 自动刮削音频元数据
- **图片**：目录扫描自动提取元数据（尺寸、拍摄时间、GPS 坐标、EXIF 朝向），支持缩略图生成与自动转正
- **视频**：目录扫描自动提取元数据（尺寸、拍摄时间、GPS 坐标），支持缩略图生成
- **软删除与回收站**：音频/图片/视频均支持软删除、恢复与硬删除
- **FTP 同步**：测试连接、浏览远端目录、对比本地与远端差异、执行同步
- **本地目录浏览**：浏览本地文件系统目录，辅助路径配置
- **服务配置管理**：音频/图片/视频存储目录、AcoustID API Key
- **深浅色主题**：支持亮色/暗色模式切换

## 技术栈

- 后端：Go 1.26 / Gin / GORM / SQLite
- 音频元数据：taglib / fpcalc + AcoustID
- 图片处理：imagemeta（EXIF）/ imaging（缩略图）
- 视频处理：ffprobe（元数据）/ ffmpeg（缩略图）
- FTP：jlaffaye/ftp
- 前端：HTML + CSS + JavaScript（位于 `dist/`）
- API 定义：OpenAPI 3.0（`docs/openapi.yaml`）
- 代码生成：oapi-codegen（类型与接口）+ 自定义 codegen（handler/logic 脚手架）
- 安装包：Inno Setup（Windows）

## 项目结构

```
Rivus/
├── main.go                  # 程序入口，启动 HTTP 服务
├── docs/
│   └── openapi.yaml         # OpenAPI 3.0 接口定义
├── internal/
│   ├── generated/           # oapi-codegen 生成的类型与接口
│   ├── handler/             # 请求处理层（路由 → handler）
│   ├── logic/               # 业务逻辑层
│   ├── model/               # 数据模型（audio/image/video/config）
│   ├── repository/          # 数据访问层
│   └── tool/                # 工具函数（文件操作、HTTP 客户端）
├── dist/                    # 前端静态资源（HTML + CSS + JS）
├── bin/                     # 二进制依赖（ffmpeg/ffprobe/fpcalc/zhhz）
├── tools/
│   └── codegen/             # 自定义代码生成器
├── assets/                  # 应用图标
├── Rivus.iss                # Inno Setup 打包脚本
└── Makefile                 # 构建与代码生成命令
```

## 快速开始

### 前置依赖

- Go 1.26+
- [oapi-codegen](https://github.com/oapi-codegen/oapi-codegen)
- [goimports](https://pkg.go.dev/golang.org/x/tools/cmd/goimports)
- `bin/` 目录下的二进制工具会自动解压（ffmpeg / ffprobe / fpcalc / zhhz）

### 运行

```bash
make run
```

服务默认监听 `http://localhost:8080`，数据存储在 `~/.Rivus/` 目录下。若端口已被占用，会自动打开浏览器跳转到已有实例。

### 构建

```bash
make build      # 编译 Windows GUI 程序（不显示控制台窗口）
make package    # 编译并使用 Inno Setup 打包为安装程序
```

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

### 系统

| 方法 | 路径          | 说明         |
| ---- | ------------- | ------------ |
| GET  | /ping         | 健康检查     |
| GET  | /config       | 获取配置     |
| POST | /config       | 设置配置     |
| GET  | /browse       | 浏览本地目录 |
| GET  | /shutdown     | 关闭服务     |

### 音频

| 方法   | 路径                | 说明               |
| ------ | ------------------- | ------------------ |
| GET    | /audio/scan         | 扫描音频目录       |
| GET    | /audio/search       | 搜索音频           |
| POST   | /audio/update       | 更新音频元数据     |
| DELETE | /audio/delete       | 删除音频           |
| POST   | /audio/restore      | 恢复音频           |
| GET    | /audio/recyclebin   | 获取回收站列表     |
| GET    | /audio/source       | 获取音频流         |
| POST   | /audio/upload       | 上传音频文件       |
| GET    | /audio/scrape       | 刮削音频元数据     |
| GET    | /audio/lyric/source | 获取歌词           |
| POST   | /audio/lyric/upload | 上传歌词文件       |
| GET    | /audio/lyric/fetch  | 在线拉取歌词       |

### 图片

| 方法   | 路径                | 说明               |
| ------ | ------------------- | ------------------ |
| GET    | /image/scan         | 扫描图片目录       |
| GET    | /image/search       | 搜索图片           |
| GET    | /image/source       | 获取图片原图       |
| GET    | /image/thumb        | 获取图片缩略图     |
| DELETE | /image/delete       | 删除图片           |
| POST   | /image/restore      | 恢复图片           |
| GET    | /image/recyclebin   | 获取回收站列表     |

### 视频

| 方法   | 路径                | 说明               |
| ------ | ------------------- | ------------------ |
| GET    | /video/scan         | 扫描视频目录       |
| GET    | /video/search       | 搜索视频           |
| GET    | /video/source       | 获取视频流         |
| GET    | /video/thumb        | 获取视频缩略图     |
| DELETE | /video/delete       | 删除视频           |
| POST   | /video/restore      | 恢复视频           |
| GET    | /video/recyclebin   | 获取回收站列表     |

### 同步

| 方法 | 路径                  | 说明               |
| ---- | --------------------- | ------------------ |
| POST | /sync/test-connection | 测试 FTP 连接      |
| GET  | /sync/browse          | 浏览 FTP 目录      |
| POST | /sync/compare         | 对比本地与远端差异 |
| POST | /sync/execute         | 执行同步操作       |

完整接口定义参见 [docs/openapi.yaml](docs/openapi.yaml)。