; Rivus.iss — Inno Setup 脚本

#define MyAppName "Rivus"
#define MyAppVersion "0.4.0"
#define MyAppPublisher "JunjiangYu"
#define MyAppExeName "Rivus.exe"

[Setup]
; AppId 必须唯一，不要和其他安装程序重复
AppId={{8F3A2C1B-4D5E-6F70-8A9B-0C1D2E3F4A5B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
; 禁用“选择开始菜单文件夹”页面，默认直接用程序名
DisableProgramGroupPage=yes
; 安装包输出到当前目录
OutputDir=.
OutputBaseFilename=Rivus-Setup
; 压缩设置
Compression=lzma2
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "chinese"; MessagesFile: "compiler:Default.isl"

[Tasks]
; 桌面快捷方式选项，默认勾选
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; 把整个 bin 目录递归打入 {app}\bin
Source: "bin\*"; DestDir: "{app}\bin"; Flags: recursesubdirs createallsubdirs
; 把整个 dist 目录递归打入 {app}\dist
Source: "dist\*"; DestDir: "{app}\dist"; Flags: recursesubdirs createallsubdirs
; 把整个 docs 目录递归打入 {app}\docs
Source: "docs\*"; DestDir: "{app}\docs"; Flags: recursesubdirs createallsubdirs
; 主程序和图标放在安装根目录
Source: "Rivus.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets/icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; 开始菜单快捷方式
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
; 桌面快捷方式，仅在用户勾选 desktopicon 任务时创建
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; 安装完成后询问是否立即运行
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent