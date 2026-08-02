# 流集 (MultiMediaManager) 前端架构说明

## 一、目录结构

```
dist/
├── assets/
│   ├── html/                     # 页面文件 (HTML)
│   │   ├── index.html            # 首页：模块选择入口
│   │   └── audiopage/
│   │       ├── console.html      # 音频管理：曲库浏览、搜索、编辑、播放
│   │       └── init.html         # 音频初始化：目录配置、扫描建档
│   ├── css/                      # 样式文件
│   │   ├── common.css            # ★ 公共样式（变量、按钮、弹窗、通知、动画）
│   │   ├── home.css              # 首页专属样式（模块卡片、状态面板）
│   │   ├── init.css              # 初始化页专属样式（扫描面板、步骤指示器、控制台）
│   │   ├── lib.css               # 管理页专属样式（搜索栏、表格、分页、统计条）
│   │   └── player.css            # 播放器专属样式（底部播放栏、音量弹出窗）
│   └── js/                       # 脚本文件
│       ├── common.js             # ★ 公共逻辑（state、API封装、主题、通知、工具函数）
│       ├── home.js               # 首页逻辑（加载状态、模块卡片点击）
│       ├── init.js               # 初始化页逻辑（目录检测、扫描流程、按钮状态管理）
│       ├── lib.js                # 管理页逻辑（曲库加载、表格渲染、分页、编辑/删除弹窗、离开拦截）
│       └── player.js             # 播放器逻辑（独立模块，含音量控制与静音切换）
```

## 二、路由与页面映射

| 访问 URL | 服务端路由 | 对应 HTML 文件 | 页面功能 |
|---|---|---|---|
| `/` | `r.GET("/", ...)` | `assets/html/index.html` | 首页：模块选择、系统状态 |
| `/audiopage/console` | `r.GET("/audiopage/console", ...)` | `assets/html/audiopage/console.html` | 音频管理：曲库、搜索、播放 |
| `/audiopage/init` | `r.GET("/audiopage/init", ...)` | `assets/html/audiopage/init.html` | 音频初始化：目录配置、扫描 |
| 其他所有路径 | `r.NoRoute(...)` | → 302 重定向到 `/` | 兜底处理 |

静态资源由 `r.Static("/assets", "./dist/assets")` 统一挂载，所有 CSS/JS 通过绝对路径 `/assets/...` 引用。

## 三、页面资源依赖关系

```
index.html
├── /assets/css/common.css       ← 公共样式
├── /assets/css/home.css         ← 首页专属样式
├── /assets/js/common.js         ← 公共逻辑
└── /assets/js/home.js           ← 首页专属逻辑

audiopage/console.html
├── /assets/css/common.css       ← 公共样式
├── /assets/css/lib.css          ← 管理页专属样式
├── /assets/css/player.css       ← 播放器样式
├── /assets/js/common.js         ← 公共逻辑
├── /assets/js/lib.js            ← 管理页专属逻辑
└── /assets/js/player.js         ← 播放器逻辑

audiopage/init.html
├── /assets/css/common.css       ← 公共样式
├── /assets/css/init.css         ← 初始化页专属样式
├── /assets/js/common.js         ← 公共逻辑
└── /assets/js/init.js           ← 初始化页专属逻辑
```

## 四、JS 模块职责

### common.js — 公共模块
所有页面必须首先加载。提供：
- **DOM 工具**：`$()` / `$$()` 选择器
- **全局状态**：`state` 对象（theme、audioDir、page、sortBy 等）
- **API 封装**：`apiGet()` / `apiPost()` / `apiPostQuery()` / `apiDelete()`
- **主题管理**：`initTheme()` / `toggleTheme()` / `applyTheme()`，通过 `localStorage` 持久化
- **通知**：`showToast(msg, type)` — type 支持 `'ok'` / `'warn'` / `'err'`
- **工具函数**：`esc()` / `formatSize()` / `basename()` / `getExtClass()` / `fetchAllSongs()`
- **主题按钮绑定**：`bindThemeButtons()` — 给所有 `.js-theme` 按钮绑定切换事件

### home.js — 首页
- `loadHomeStatus()`：调用 `/config` 和 `/audio/search` 获取系统状态、曲库统计
- 根据 `state.audioDir` 是否为空，决定点击音频卡片跳转到 `/audiopage/console` 还是 `/audiopage/init`
- 未开放模块（图片/视频）点击显示"即将上线"提示

### init.js — 初始化页
- **自动加载**：页面加载时调用 `/config` 检查是否已有配置，有则自动填入目录并显示"进入管理页面"按钮
- `checkDir(path)`：用户输入目录后，对比后端配置判断是否已配置
- `startScan()`：置灰按钮 → 文字变为"扫描中…"（带旋转动画）→ 配置目录 → 扫描 → 成功后跳转管理页
- **失败恢复**：配置失败/扫描失败/连接异常时，恢复按钮文字和可用状态

### lib.js — 管理页
- `loadLibrary()`：加载曲库/回收站数据，支持分页、排序、搜索、范围过滤
- `renderTable()`：渲染歌曲表格，每行绑定播放、编辑、删除按钮
- `updatePager()`：渲染分页栏（含定位按钮、页码、跳转）
- `openEdit(id)` / `closeEdit()`：编辑弹窗
- `confirmAction(action, id)`：确认弹窗（删除/恢复/彻底删除）
- `navigateToSong(songId)`：定位到指定歌曲所在页
- **离开拦截**：正在播放时点击"返回主页"或"重新扫描"弹出确认弹窗（确认/取消按钮居中，确认按钮琥珀色高亮），`beforeunload` 拦截浏览器级离开
- 键盘快捷键：`Esc` 关闭弹窗，`/` 聚焦搜索框

### player.js — 播放器
独立的音频播放模块，挂载在 `window.Player`。
- 支持顺序播放、单曲循环、随机播放
- 播放列表管理、进度条、上一首/下一首
- **音量控制**：纵向弹出窗（`mouseenter` 显示），拖动滑块调节音量，点击喇叭图标切换静音/恢复
- 正在播放歌曲的高亮与动画指示
- 通过 `Player.setPlaylist(songs, startIndex)` 从外部传入播放列表

## 五、CSS 模块职责

### common.css — 公共样式
- **CSS 变量**：`--bg0` ~ `--bg3`、`--line` / `--line2`、`--ink` ~ `--ink3`、`--amber` / `--teal` / `--rose` / `--blue` / `--green`
- **深色/浅色主题**：通过 `[data-theme="dark"]` / `[data-theme="light"]` 切换变量值
- **基础重置**：`body`、`a`、`button`、`input`、`select` 的默认样式
- **通用组件**：`.btn`、`.icon-btn`、`.card`、`.topbar`、`.home-top`
- **弹窗**：`.overlay`、`.modal`、`.modal-head`、`.modal-body`、`.modal-foot`
- **通知**：`#toasts`、`.toast`、`.t-warn`、`.t-err`
- **动画**：`@keyframes spin`、`@keyframes pulse`、`@keyframes nope`、`.spin`

### home.css — 首页
- `.mod-grid` / `.mod-card`：模块卡片网格与悬停效果
- `.status-chip`：初始化状态标签（就绪/未初始化）
- `.audio-meta`：曲库统计信息
- `.lock-tag` / `.mod-locked`：未开放模块的锁定样式

### init.css — 初始化页
- `.setup-wrap`：左右分栏布局
- `.steps`：三步指示器（选择目录 → 扫描建档 → 开始管理）
- `.scan-card` / `.console`：扫描面板、控制台日志
- `.pulse-dot`：扫描中的脉冲动画点
- `.dir-input` / `.dir-row`：目录输入框

### lib.css — 管理页
- `.search-box` / `.seg`：搜索栏与范围分段选择器
- `.table-card` / `.song-row`：表格与行样式，含播放高亮、动画
- `.pager-bar` / `.pg-nums`：分页栏
- `.stats-strip`：统计条（歌曲数、空间、专辑数、回收站）

### player.css — 播放器
- `#playerBar`：底部播放栏整体布局
- `.pl-info` / `.pl-ctrls` / `.pl-prog`：信息区、控制区、进度区
- `.pl-vol-popup`：音量纵向弹出窗（hover 显示，含纵向滑块与数值）
- 播放栏展开/收起动画

## 六、页面间导航流程

```
 ┌──────────┐   点击"音频管理"卡片
 │  index   │ ──────────────────────┐
 │  (首页)   │                        │
 └────┬─────┘                        │
      │                              ▼
      │                     ┌──────────────────┐
      │                     │  audioDir 已配置?  │
      │                     └──────┬───────┬───┘
      │                       是   │       │  否
      │                            ▼       ▼
      │                  ┌────────────┐ ┌────────────┐
      │                  │  console   │ │    init     │
      │                  │  (管理页)   │ │  (初始化页)  │
      │                  └─────┬──────┘ └─────┬──────┘
      │                        │              │
      │     "重新扫描"          │    扫描完成    │
      │  ◄─────────────────────┘  ◄───────────┘
      │
      └── 顶部"返回"按钮可回到首页
```

所有页面顶部均有主题切换按钮（`.js-theme`），深色/浅色模式通过 `localStorage` 持久化。

## 七、后端 API 依赖

| 接口 | 方法 | 用途 | 调用页面 |
|---|---|---|---|
| `/config` | GET | 获取当前配置（含 audio_dir） | 首页、初始化页 |
| `/config` | POST | 设置音频目录 | 初始化页 |
| `/audio/search` | GET | 搜索/分页查询歌曲 | 首页、管理页 |
| `/audio/scan` | GET | 触发音频扫描 | 初始化页 |
| `/audio/update` | POST | 更新歌曲元数据 | 管理页 |
| `/audio/delete` | DELETE | 删除/彻底删除歌曲 | 管理页 |
| `/audio/restore` | POST | 从回收站恢复 | 管理页 |
| `/audio/recyclebin` | GET | 查询回收站 | 管理页 |

## 八、主题系统

主题通过 CSS 变量实现，在 `common.css` 中定义两套变量：

```css
:root[data-theme="dark"]  { --bg0: #0d1117; ... }
:root[data-theme="light"] { --bg0: #f8f9fb; ... }
```

切换时 `common.js` 修改 `<html data-theme="...">` 属性并写入 `localStorage`。所有组件颜色均引用 CSS 变量，确保主题切换时全局生效。