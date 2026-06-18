# CLI 工具管理器

一个跨平台的通用命令行工具管理平台，用于统一发现、安装、更新、配置和卸载系统中所有的 CLI 工具。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 功能特性

- 🔍 **工具发现**：自动扫描 PATH、npm 全局包、pip 包中的 CLI 工具
- 📊 **信息展示**：列表、详情、分类统计、版本信息
- 📦 **多源安装**：支持 npm、pip、GitHub Releases、scoop、winget、choco
- 📝 **安装配方**：24 个内置常用工具配方，支持 YAML 自定义扩展
- 🔄 **版本管理**：更新、切换、锁定、回退工具版本
- 🌐 **环境管理**：PATH 诊断、环境变量查看、系统健康检查
- 💾 **备份同步**：导出/恢复工具清单，支持 Git 多机同步
- 🖥️ **多种界面**：交互式 Shell、Web 面板、TUI 仪表盘、Shell 自动补全

## 快速开始

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd cli-manager

# 安装依赖
pnpm install

# 构建
pnpm build

# 启动（首次运行进入初始化向导）
node dist/index.js init
```

### 常用命令

```bash
# 扫描系统中的 CLI 工具
node dist/index.js scan --full

# 列出所有工具
node dist/index.js list

# 查看工具详情
node dist/index.js info node

# 安装工具（优先使用配方）
node dist/index.js install git
node dist/index.js install node --from winget

# 查看可用配方
node dist/index.js recipe list
node dist/index.js recipe show git

# 系统健康检查
node dist/index.js doctor

# 导出备份
node dist/index.js backup

# 启动 Web 面板
node dist/index.js web --port 8080

# TUI 仪表盘
node dist/index.js dashboard

# 生成 Shell 补全
node dist/index.js completion powershell
node dist/index.js completion bash
node dist/index.js completion zsh
```

## 命令列表

| 命令 | 说明 |
|------|------|
| `scan` | 扫描系统中的 CLI 工具 |
| `config` | 管理配置 |
| `init` | 初始化配置向导 |
| `list` | 列出所有工具 |
| `info <name>` | 查看工具详情 |
| `which <name>` | 定位工具路径 |
| `status` | 系统概览 |
| `category` | 管理工具分类 |
| `outdated` | 列出可更新工具 |
| `install <name>` | 安装工具 |
| `uninstall <name>` | 卸载工具 |
| `update [name]` | 更新工具 |
| `version <name>` | 查看版本 |
| `use <name> [version]` | 切换版本 |
| `pin/unpin <name>` | 锁定/解锁版本 |
| `rollback <name>` | 回退版本 |
| `history <name>` | 版本历史 |
| `path` | PATH 管理 |
| `env` | 环境变量管理 |
| `doctor` | 健康检查 |
| `backup` | 导出备份 |
| `restore <file>` | 从备份恢复 |
| `sync` | 多机同步 |
| `stats` | 使用统计 |
| `report` | 环境报告 |
| `recipe` | 安装配方管理 |
| `completion` | 生成补全脚本 |
| `web` | Web 管理面板 |
| `dashboard` | TUI 仪表盘 |

## 技术栈

- **运行环境**：Node.js >= 18
- **语言**：TypeScript 5.5
- **CLI 框架**：commander.js
- **数据存储**：better-sqlite3
- **终端输出**：chalk、cli-table3、ora
- **YAML 解析**：js-yaml
- **测试框架**：vitest

## 项目结构

```
cli-manager/
├── src/
│   ├── commands/     # 命令实现
│   ├── scanner/      # 发现引擎
│   ├── installer/    # 安装引擎
│   ├── db/           # 数据库层
│   ├── recipe/       # 安装配方
│   ├── ui/           # 用户界面
│   ├── completion/   # Shell 补全
│   ├── plugins/      # 插件系统
│   ├── utils/        # 工具函数
│   └── types/        # 类型定义
├── tests/            # 单元测试
├── docs/             # 开发文档
└── recipes/          # 用户自定义配方目录
```

## 开发

```bash
# 开发模式（自动构建）
pnpm dev

# 运行测试
pnpm test

# 类型检查
pnpm lint
```

## 自定义配方

在 `~/.cli-manager/recipes/` 或项目 `recipes/` 目录下创建 YAML 文件：

```yaml
name: my-tool
displayName: My Tool
description: 我的自定义工具
category: dev
sources:
  - type: npm
    packageName: my-tool
    executableName: my-tool
  - type: scoop
    packageName: my-tool
versionCmd: 'my-tool --version'
versionRegex: '(\d+\.\d+\.\d+)'
postInstall:
  - 'my-tool --init'
```

## 配置

配置文件位于 `~/.cli-manager/config.json`，可通过 `config` 命令管理：

```bash
node dist/index.js config list
node dist/index.js config set scanInterval daily
node dist/index.js config set defaultFormat json
```

## 许可证

MIT
