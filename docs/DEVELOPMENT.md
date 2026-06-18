# CLI 工具管理器 — 开发文档

> 版本：v1.0  
> 更新日期：2026-06-18  
> 对应需求清单：REQUIREMENTS.md

---

## 目录

- [一、项目概述](#一项目概述)
- [二、技术选型](#二技术选型)
- [三、项目架构](#三项目架构)
- [四、开发环境](#四开发环境)
- [五、任务分解（P0 — 核心基础设施）](#五任务分解p0--核心基础设施)
- [六、任务分解（P1 — 工具展示与查询）](#六任务分解p1--工具展示与查询)
- [七、任务分解（P2 — 安装与卸载）](#七任务分解p2--安装与卸载)
- [八、任务分解（P3 — 版本管理与更新）](#八任务分解p3--版本管理与更新)
- [九、任务分解（P4 — PATH 与环境管理）](#九任务分解p4--path-与环境管理)
- [十、任务分解（P5 — 备份/恢复/统计）](#十任务分解p5--备份恢复统计)
- [十一、任务分解（P6 — 用户体验增强）](#十一任务分解p6--用户体验增强)
- [十二、总任务汇总表](#十二总任务汇总表)
- [十三、里程碑与发布计划](#十三里程碑与发布计划)

---

## 一、项目概述

### 1.1 项目目标

构建一个跨平台的通用 CLI 工具管理器，统一管理系统中所有命令行工具的发现、安装、更新、配置和卸载。

### 1.2 项目范围

- **包含**：工具发现扫描、信息展示、多源安装、版本管理、PATH 管理、环境诊断、备份恢复
- **不包含**：软件包构建、依赖解析树、离线包缓存、私有仓库托管

### 1.3 目标用户

- 开发者（主力用户）：日常管理开发工具链
- 运维人员：批量管理服务器工具环境
- 普通终端用户：统一管理系统 CLI 工具

---

## 二、技术选型

| 层次 | 技术选择 | 理由 |
|------|----------|------|
| **运行时** | Node.js >= 18 (LTS) | 跨平台支持好，npm 生态丰富，适合 CLI 工具开发 |
| **语言** | TypeScript ~5.5 | 类型安全，提高大型项目的可维护性 |
| **包管理** | pnpm | 速度快，节省磁盘，严格依赖管理 |
| **CLI 框架** | commander.js ^12 | 成熟的命令解析库，支持子命令、参数校验、自动帮助 |
| **终端输出** | chalk ^5 + cli-table3 + ora | 彩色输出、表格渲染、进度指示器 |
| **数据存储** | better-sqlite3 ^11 | 嵌入式数据库，零配置，性能优秀 |
| **版本比较** | semver ^7 | 语义化版本解析和比较 |
| **HTTP 客户端** | undici ^6 / node fetch | 用于 GitHub API 调用和远程资源下载 |
| **Shell 补全** | 自研模板生成 | 为 bash/zsh/powershell 生成补全脚本 |
| **测试框架** | vitest ^2 | 与 Vite 兼容，速度快，支持 ESM |
| **构建工具** | tsup / pkg | 打包为可执行文件或 npm 包 |
| **配置文件** | 项目级 ~/.cli-manager/config.json | 标准 XDG 配置目录 |

### 跨平台兼容策略

| 平台 | 路径风格 | 包管理器 | 特殊处理 |
|------|----------|----------|----------|
| Windows | 反斜杠 + 盘符 | npm/scoop/winget/choco | `.exe`/`.ps1`/`.cmd` 检测，PowerShell 补全 |
| macOS | POSIX 路径 | brew/npm/pip | `.app` 包检测，`.zshrc` 补全 |
| Linux | POSIX 路径 | apt/npm/pip | 各发行版差异处理，`.bashrc` 补全 |

---

## 三、项目架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI 入口层                           │
│                  cli-manager [命令] [参数]                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                      命令路由层                               │
│       Commander.js 注册所有命令和子命令                       │
│       list | info | install | update | path | backup ...     │
└───────┬──────────┬──────────┬──────────┬─────────────────────┘
        │          │          │          │
┌───────▼──┐ ┌─────▼──────┐ ┌▼─────────▼┐ ┌───────────────────┐
│ 发现引擎  │ │ 安装引擎   │ │ 版本管理器 │ │ 环境管理器         │
│ Scanner   │ │ Installer  │ │ Versioner  │ │ EnvManager         │
│           │ │           │ │           │ │                   │
│ • PATH    │ │ • npm     │ │ • 版本检测 │ │ • PATH 解析       │
│ • npm     │ │ • pip     │ │ • 版本切换 │ │ • 变量管理        │
│ • pip     │ │ • GitHub  │ │ • 版本锁定 │ │ • doctor 诊断     │
│ • 元数据  │ │ • scoop   │ │ • 更新检查 │ │ • 运行时检测      │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └────────┬──────────┘
      │             │             │                 │
      └─────────────┴─────────────┴─────────────────┘
                        │
            ┌───────────▼───────────┐
            │     数据持久化层        │
            │   better-sqlite3       │
            │ 工具清单 | 配置 | 历史  │
            └───────────────────────┘
```

### 3.2 目录结构

```
cli-manager/
├── src/
│   ├── index.ts                 # 入口文件，启动 CLI
│   ├── types/                   # TypeScript 类型定义
│   │   ├── tool.ts              # 工具信息数据模型
│   │   ├── config.ts            # 配置类型定义
│   │   └── recipe.ts            # 安装配方类型
│   ├── commands/                # 命令实现（按子命令分组）
│   │   ├── list.ts              # list 命令
│   │   ├── info.ts              # info 命令
│   │   ├── which.ts             # which 命令
│   │   ├── install.ts           # install 命令
│   │   ├── uninstall.ts         # uninstall 命令
│   │   ├── update.ts            # update 命令
│   │   ├── version.ts           # version/use/pin 子命令
│   │   ├── path.ts              # path 子命令
│   │   ├── category.ts          # category 子命令
│   │   ├── backup.ts            # backup/restore 命令
│   │   ├── status.ts            # status 命令
│   │   ├── doctor.ts            # doctor 命令
│   │   ├── outdated.ts          # outdated 命令
│   │   ├── stats.ts             # stats 命令
│   │   ├── report.ts            # report 命令
│   │   └── interactive.ts       # 交互式 Shell 模式
│   ├── scanner/                 # 发现引擎
│   │   ├── index.ts             # 扫描器入口
│   │   ├── path-scanner.ts      # PATH 目录扫描
│   │   ├── npm-scanner.ts       # npm 全局包扫描
│   │   ├── pip-scanner.ts       # pip 包扫描
│   │   ├── version-extractor.ts # 版本号提取
│   │   └── metadata.ts          # 元数据采集
│   ├── installer/               # 安装引擎
│   │   ├── index.ts             # 安装器入口
│   │   ├── npm-installer.ts     # npm 安装源
│   │   ├── pip-installer.ts     # pip 安装源
│   │   ├── github-installer.ts  # GitHub Releases 源
│   │   ├── scoop-installer.ts   # scoop 集成
│   │   ├── winget-installer.ts  # winget 集成
│   │   ├── choco-installer.ts   # chocolatey 集成
│   │   └── recipe-engine.ts     # 配方引擎
│   ├── versioner/               # 版本管理器
│   │   ├── index.ts             # 版本管理器入口
│   │   ├── switcher.ts          # 版本切换
│   │   ├── pinner.ts            # 版本锁定
│   │   ├── updater.ts           # 更新检查
│   │   └── history.ts           # 版本历史
│   ├── env/                     # 环境管理器
│   │   ├── index.ts             # 环境管理器入口
│   │   ├── path-manager.ts      # PATH 管理
│   │   ├── variable-manager.ts  # 环境变量管理
│   │   ├── runtime-detector.ts  # 运行时检测
│   │   └── doctor.ts            # 健康检查
│   ├── db/                      # 数据库层
│   │   ├── index.ts             # 数据库初始化
│   │   ├── schema.ts            # 表结构定义
│   │   ├── tool-repo.ts         # 工具清单 CRUD
│   │   ├── config-repo.ts       # 配置 CRUD
│   │   └── history-repo.ts      # 版本历史 CRUD
│   ├── recipe/                  # 安装配方
│   │   ├── loader.ts            # 配方加载器
│   │   ├── registry.ts          # 配方注册表（含 CRUD）
│   │   ├── user-loader.ts       # 用户配方加载（实时重载）
│   │   └── builtin/             # 内置配方（YAML）
│   │       ├── git.yml
│   │       ├── node.yml
│   │       ├── python.yml
│   │       └── ...
│   ├── ui/                      # 用户界面
│   │   ├── formatter.ts         # 输出格式化
│   │   ├── table.ts             # 表格渲染
│   │   ├── spinner.ts           # 进度指示器
│   │   ├── colors.ts            # 颜色主题
│   │   └── prompt.ts            # 交互式提示
│   ├── completion/              # Shell 补全
│   │   ├── powershell.ts        # PowerShell 补全生成
│   │   ├── bash.ts              # bash 补全生成
│   │   └── zsh.ts               # zsh 补全生成
│   └── utils/                   # 工具函数
│       ├── path.ts              # 路径处理
│       ├── exec.ts              # 子进程执行
│       ├── platform.ts          # 平台检测
│       └── validation.ts        # 参数校验
├── recipes/                     # 用户自定义配方目录
├── docs/                        # 文档
├── tests/                       # 测试
│   ├── scanner/
│   ├── installer/
│   ├── versioner/
│   ├── env/
│   └── commands/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### 3.3 数据模型

```typescript
// 工具信息模型
interface ToolInfo {
  id: string;                    // 唯一标识 (name@version_hash)
  name: string;                  // 工具名称
  fullPath: string;              // 完整路径
  version: string | null;        // 版本号 (如 "1.2.3")
  source: ToolSource;            // 来源: "system" | "npm" | "pip" | "scoop" | "winget" | "choco" | "manual"
  category: string;              // 分类: "dev" | "ai" | "system" | "editor" | "other"
  fileSize: number;              // 文件大小 (字节)
  fileType: FileType;            // 文件类型: "exe" | "ps1" | "cmd" | "bat" | "script"
  isSigned: boolean;             // 是否有数字签名
  modifiedAt: string;            // 文件修改时间 (ISO)
  firstDetectedAt: string;       // 首次发现时间
  lastDetectedAt: string;        // 最近发现时间
  isPinned: boolean;             // 是否锁定版本
  pinnedVersion: string | null;  // 锁定版本号
  pathPriority: number;          // PATH 优先级 (0=最高)
}

// 配置模型
interface Config {
  scanInterval: 'daily' | 'weekly' | 'manual';  // 扫描频率
  autoUpdateCheck: boolean;                       // 自动检查更新
  colorEnabled: boolean;                          // 彩色输出
  defaultFormat: 'table' | 'json' | 'text';       // 默认输出格式
  installSource: InstallSource[];                 // 启用安装源
  dbPath: string;                                 // 数据库路径
}

// 安装配方模型
interface Recipe {
  name: string;                  // 工具名
  displayName: string;           // 显示名称
  description: string;           // 描述
  category: string;              // 分类
  sources: RecipeSource[];       // 安装源列表
  versionCmd: string;            // 版本检测命令
  versionRegex: string;          // 版本号提取正则
  postInstall?: string[];        // 安装后操作
}
```

---

## 四、开发环境

### 4.1 环境要求

| 依赖 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 18.0.0 | 22.x LTS |
| pnpm | 8.0.0 | 9.x |
| TypeScript | 5.0 | 5.5+ |
| Git | 2.30 | 2.45+ |

### 4.2 初始化步骤

```bash
# 克隆项目
cd cli-manager

# 安装依赖
pnpm install

# 构建
pnpm build

# 开发模式
pnpm dev

# 运行测试
pnpm test
```

### 4.3 代码规范

| 规范 | 标准 |
|------|------|
| 缩进 | 2 空格 |
| 引号 | 单引号 |
| 行尾 | LF |
| 命名 | camelCase（变量/函数）、PascalCase（类/类型）、kebab-case（文件） |
| 注释 | 中文注释，遵循 JSDoc 标准 |
| 最大行数 | 每文件 ≤ 300 行 |
| 提交规范 | Conventional Commits（feat/fix/docs/refactor/test） |

---

## 五、任务分解（P0 — 核心基础设施）

### 阶段 0-1：项目初始化与基础框架

---

#### TASK-P0-001：初始化 Node.js/TypeScript 项目

| 字段 | 内容 |
|------|------|
| **所属模块** | 项目基础设施 |
| **优先级** | 🔴 P0 |
| **前置依赖** | 无 |
| **详细描述** | 创建 package.json、tsconfig.json、pnpm-workspace.yaml，安装核心依赖（commander、chalk、better-sqlite3、ora、cli-table3、semver），配置构建脚本和开发脚本 |
| **预估工时** | 0.5 人天 |
| **验收标准** | `pnpm build` 成功产出 dist/ 目录；`pnpm dev` 可启动开发模式 |
| **交付物** | package.json、tsconfig.json、pnpm-lock.yaml、vitest.config.ts |

---

#### TASK-P0-002：实现 CLI 入口与命令路由

| 字段 | 内容 |
|------|------|
| **所属模块** | 命令框架 |
| **优先级** | 🔴 P0 |
| **前置依赖** | TASK-P0-001 |
| **详细描述** | 创建 `src/index.ts` 作为 CLI 入口，使用 commander.js 搭建命令框架，定义全局选项（`--help`、`--version`、`--no-color`、`--format`），预留各子命令注册接口 |
| **预估工时** | 0.5 人天 |
| **验收标准** | 运行 `cli-manager --help` 显示帮助信息；`cli-manager --version` 显示版本号；`cli-manager <未知命令>` 报错并提供建议 |
| **交付物** | src/index.ts、src/commands/（目录结构） |

---

#### TASK-P0-003：实现工具信息数据模型与类型定义

| 字段 | 内容 |
|------|------|
| **所属模块** | 清单数据库 |
| **优先级** | 🔴 P0 |
| **前置依赖** | TASK-P0-001 |
| **详细描述** | 定义 ToolInfo、Config、Recipe、ScanResult 等 TypeScript 类型和接口，包含完整的 JSDoc 注释，导出所有类型供其他模块使用 |
| **预估工时** | 0.5 人天 |
| **验收标准** | 所有类型定义正确，编译通过；类型覆盖 10+ 字段；JSDoc 注释完整 |
| **交付物** | src/types/tool.ts、src/types/config.ts、src/types/recipe.ts |

---

#### TASK-P0-004：实现 SQLite 数据库层

| 字段 | 内容 |
|------|------|
| **所属模块** | 清单数据库 |
| **优先级** | 🔴 P0 |
| **前置依赖** | TASK-P0-003 |
| **详细描述** | 使用 better-sqlite3 实现数据库初始化（建表：`tools`、`config`、`scan_history`、`version_history`），实现 ToolRepo（CRUD 工具清单）、ConfigRepo（读写配置）、HistoryRepo（读写版本历史），支持事务操作 |
| **预估工时** | 1.5 人天 |
| **验收标准** | 数据库自动创建于 `~/.cli-manager/data.db`；表结构完整；CRUD 操作正确；事务回滚生效 |
| **交付物** | src/db/index.ts、src/db/schema.ts、src/db/tool-repo.ts、src/db/config-repo.ts、src/db/history-repo.ts |

---

### 阶段 0-2：工具发现引擎

---

#### TASK-P0-005：实现 PATH 目录遍历扫描器

| 字段 | 内容 |
|------|------|
| **所属模块** | 发现引擎 |
| **优先级** | 🔴 P0 |
| **前置依赖** | TASK-P0-003、TASK-P0-004 |
| **详细描述** | 读取系统 PATH 环境变量（跨平台），解析并去重所有目录，遍历每个目录下的文件，识别可执行文件（Windows 下检测 `.exe`/`.ps1`/`.cmd`/`.bat`/无扩展名，Unix 下检测可执行权限位），对每个可执行文件提取基本信息（名称、完整路径、文件大小、修改时间） |
| **预估工时** | 2 人天 |
| **验收标准** | 正确读取系统 PATH（与 `$env:PATH` 一致）；遍历所有目录无遗漏；可执行文件识别准确率 > 99%；扫描 1000+ 文件时性能 < 5s |
| **交付物** | src/scanner/path-scanner.ts、src/scanner/index.ts（扫描器入口） |

---

#### TASK-P0-006：实现 npm 全局包扫描器

| 字段 | 内容 |
|------|------|
| **所属模块** | 发现引擎 |
| **优先级** | 🔴 P0 |
| **前置依赖** | TASK-P0-005 |
| **详细描述** | 执行 `npm root -g` 获取全局 node_modules 路径，遍历其中每个包的 package.json，提取 name/version/bin 字段，识别所有 CLI 入口点，标记 source 为 `npm` |
| **预估工时** | 1 人天 |
| **验收标准** | 正确识别所有 npm 全局包；与 `npm list -g --depth=0` 结果一致；包入口点检测准确 |
| **交付物** | src/scanner/npm-scanner.ts |

---

#### TASK-P0-007：实现 pip 包扫描器

| 字段 | 内容 |
|------|------|
| **所属模块** | 发现引擎 |
| **优先级** | 🔴 P0 |
| **前置依赖** | TASK-P0-005 |
| **详细描述** | 执行 `pip list --format=json` 获取已安装包列表，对每个包查找其 console_scripts 入口点，识别 CLI 工具，标记 source 为 `pip`。Windows 下扫描 Scripts/ 目录中的 `.exe` 文件 |
| **预估工时** | 1 人天 |
| **验收标准** | 正确识别 pip 安装的 CLI 工具；入口点检测准确；无 Python 环境时优雅降级 |
| **交付物** | src/scanner/pip-scanner.ts |

---

#### TASK-P0-008：实现版本号自动提取器

| 字段 | 内容 |
|------|------|
| **所属模块** | 发现引擎 |
| **优先级** | 🔴 P0 |
| **前置依赖** | TASK-P0-005 |
| **详细描述** | 对每个工具尝试执行 `--version`、`-v`、`version` 参数（带超时 3s），通过正则表达式（`/\d+\.\d+\.\d+/` 等）提取语义化版本号，缓存结果避免重复执行，失败时标记为 `null` |
| **预估工时** | 1.5 人天 |
| **验收标准** | 80%+ 工具能正确提取版本；超时处理安全（不阻塞主流程）；缓存机制生效（相同工具不重复执行） |
| **交付物** | src/scanner/version-extractor.ts |

---

#### TASK-P0-009：实现元数据采集与来源分类

| 字段 | 内容 |
|------|------|
| **所属模块** | 发现引擎 |
| **优先级** | 🔴 P0 |
| **前置依赖** | TASK-P0-005、TASK-P0-006、TASK-P0-007 |
| **详细描述** | 采集工具的数字签名状态（Windows）、文件权限（Unix）；整合 PATH 扫描、npm 扫描、pip 扫描结果，自动判断工具来源分类（system/npm/pip/manual），同名工具按 PATH 优先级去重排序 |
| **预估工时** | 1.5 人天 |
| **验收标准** | 工具来源分类准确率 > 90%；同名工具正确排序；去重后无重复项 |
| **交付物** | src/scanner/metadata.ts |

---

#### TASK-P0-010：实现全量扫描与增量扫描

| 字段 | 内容 |
|------|------|
| **所属模块** | 发现引擎 |
| **优先级** | 🔴 P0 |
| **前置依赖** | TASK-P0-005 ~ TASK-P0-009、TASK-P0-004 |
| **详细描述** | 实现 Scanner 主流程：全量扫描（遍历 PATH + npm + pip，合并去重，存入数据库）；增量扫描（对比上次快照，只处理新增/变更/移除的工具）；写入 scan_history 表记录每次扫描结果 |
| **预估工时** | 1.5 人天 |
| **验收标准** | 全量扫描完整入库；增量扫描只处理变更项；scan_history 记录完整可追溯 |
| **交付物** | src/scanner/index.ts（扫描器主入口） |

---

### 阶段 0-3：工具扫描命令

---

#### TASK-P0-011：实现 `scan` 命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 命令框架 |
| **优先级** | 🔴 P0 |
| **前置依赖** | TASK-P0-002、TASK-P0-010 |
| **详细描述** | 注册 `cli-manager scan` 命令，支持 `--full`（强制全量扫描）、`--watch`（监听文件变更）选项，调用 Scanner 执行扫描，展示扫描结果摘要（新增/变更/移除数量） |
| **预估工时** | 1 人天 |
| **验收标准** | `scan` 执行增量扫描；`scan --full` 执行全量扫描；扫描摘要显示正确 |
| **交付物** | src/commands/scan.ts |

---

#### TASK-P0-012：实现帮助与输出格式化系统

| 字段 | 内容 |
|------|------|
| **所属模块** | 命令框架 |
| **优先级** | 🔴 P0 |
| **前置依赖** | TASK-P0-002 |
| **详细描述** | 实现统一的输出格式化模块：表格渲染（cli-table3）、JSON 输出（`--format json`）、纯文本输出（`--format text`）、彩色输出（chalk，支持 `--no-color`）；为所有命令自动集成 `--help` 和 `--format` 选项 |
| **预估工时** | 1.5 人天 |
| **验收标准** | 三种输出格式均可用；彩色输出/无彩色切换正确；`--help` 显示完整帮助 |
| **交付物** | src/ui/formatter.ts、src/ui/table.ts、src/ui/colors.ts |

---

#### TASK-P0-013：实现配置管理子模块

| 字段 | 内容 |
|------|------|
| **所属模块** | 命令框架 |
| **优先级** | 🔴 P0 |
| **前置依赖** | TASK-P0-004 |
| **详细描述** | 实现配置的读取/保存/验证逻辑，配置文件位于 `~/.cli-manager/config.json`，默认配置包含 scanInterval/autoUpdateCheck/colorEnabled/defaultFormat/installSource 等字段；提供 `cli-manager config` 命令（get/set/list）管理配置 |
| **预估工时** | 1 人天 |
| **验收标准** | 配置文件自动创建；`config get/set/list` 命令可用；非法配置值报错 |
| **交付物** | src/commands/config.ts、src/db/config-repo.ts（增强） |

---

## 六、任务分解（P1 — 工具展示与查询）

---

#### TASK-P1-001：实现 `list` 命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 展示查询 |
| **优先级** | 🟠 P1 |
| **前置依赖** | TASK-P0-011、TASK-P0-012 |
| **详细描述** | 注册 `cli-manager list` 命令，从数据库读取所有工具并按类别分组展示（表格形式），支持 `--category <name>`（按分类过滤）、`--source <source>`（按来源过滤）、`--filter <keyword>`（按名称关键词搜索）、`--all`（显示完整路径） |
| **预估工时** | 2 人天 |
| **验收标准** | 列表按分类分组显示；过滤条件组合生效；`--format json` 输出完整数据；列对齐美观 |
| **交付物** | src/commands/list.ts |

---

#### TASK-P1-002：实现 `info` 命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 展示查询 |
| **优先级** | 🟠 P1 |
| **前置依赖** | TASK-P0-011、TASK-P0-012 |
| **详细描述** | 注册 `cli-manager info <name>` 命令，显示指定工具的详细信息：名称、路径、版本、来源、分类、文件大小、数字签名、最后使用时间、是否锁定、PATH 优先级、所属包等信息 |
| **预估工时** | 1.5 人天 |
| **验收标准** | info 信息完整覆盖 10+ 字段；工具不存在给出友好提示；支持模糊匹配 |
| **交付物** | src/commands/info.ts |

---

#### TASK-P1-003：实现 `which` 命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 展示查询 |
| **优先级** | 🟠 P1 |
| **前置依赖** | TASK-P0-011、TASK-P0-012 |
| **详细描述** | 注册 `cli-manager which <name>` 命令，在数据库中搜索所有同名工具，按 PATH 优先级排序展示，标记当前生效的是哪个（排第一的），显示每个匹配项的路径、来源、版本 |
| **预估工时** | 1 人天 |
| **验收标准** | 结果与系统 `where.exe`/`which` 一致；优先级标记正确；无匹配时返回空列表 |
| **交付物** | src/commands/which.ts |

---

#### TASK-P1-004：实现 `status` 命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 展示查询 |
| **优先级** | 🟠 P1 |
| **前置依赖** | TASK-P0-011、TASK-P0-012 |
| **详细描述** | 注册 `cli-manager status` 命令，显示概览仪表盘：工具总数（按来源/分类统计饼图 ASCII）、可更新工具数量、上次扫描时间、数据库大小、问题工具数（版本提取失败/路径不存在等） |
| **预估工时** | 1.5 人天 |
| **验收标准** | 统计数据准确；统计图 ASCII 显示美观；实时计算无缓存偏差 |
| **交付物** | src/commands/status.ts |

---

#### TASK-P1-005：实现 `outdated` 命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 展示查询 |
| **优先级** | 🟠 P1 |
| **前置依赖** | TASK-P0-011、TASK-P0-012、TASK-P3-005（版本检测基础） |
| **详细描述** | 注册 `cli-manager outdated` 命令，对所有工具检查是否有新版本可用，列出当前版本 vs 最新版本的对比，支持 `--source` 过滤（只检查 npm/pip 来源的工具） |
| **预估工时** | 1.5 人天 |
| **验收标准** | 版本对比准确；更新信息可读；检查过程不阻塞 UI（显示进度） |
| **交付物** | src/commands/outdated.ts |

---

#### TASK-P1-006：实现分类管理（category 命令）

| 字段 | 内容 |
|------|------|
| **所属模块** | 展示查询 |
| **优先级** | 🟠 P1 |
| **前置依赖** | TASK-P0-011、TASK-P0-012 |
| **详细描述** | 注册 `cli-manager category` 子命令：`list`（查看所有分类及工具数量）、`set <tool> <category>`（为工具设置分类）、`unset <tool>`（移除工具分类）；内置预设分类（dev/ai/system/editor/other）并在首次扫描时自动归类 |
| **预估工时** | 1.5 人天 |
| **验收标准** | 分类 CRUD 操作正确；预设分类内置；自动归类准确率 > 70% |
| **交付物** | src/commands/category.ts |

---

## 七、任务分解（P2 — 安装与卸载）

---

#### TASK-P2-001：实现安装引擎框架

| 字段 | 内容 |
|------|------|
| **所属模块** | 安装引擎 |
| **优先级** | 🟡 P2 |
| **前置依赖** | TASK-P0-002、TASK-P0-012 |
| **详细描述** | 设计 Installer 抽象接口（`install`、`uninstall`、`checkInstalled`、`getVersion`），实现安装器注册机制，按来源类型分发到具体安装器；实现公共工具函数（子进程执行、下载文件、解压、PATH 追加） |
| **预估工时** | 1.5 人天 |
| **验收标准** | 安装器接口定义清晰；注册机制可扩展；公共工具函数测试通过 |
| **交付物** | src/installer/index.ts、src/utils/exec.ts、src/utils/path.ts |

---

#### TASK-P2-002：实现 npm 安装源

| 字段 | 内容 |
|------|------|
| **所属模块** | 安装引擎 |
| **优先级** | 🟡 P2 |
| **前置依赖** | TASK-P2-001 |
| **详细描述** | 实现 NpmInstaller：`install` 执行 `npm install -g <pkg>`、`uninstall` 执行 `npm uninstall -g <pkg>`、`checkInstalled` 执行 `npm list -g <pkg> --depth=0`、安装后自动触发扫描更新清单 |
| **预估工时** | 1 人天 |
| **验收标准** | npm 包安装/卸载成功；安装后清单自动更新；安装失败抛出可读错误 |
| **交付物** | src/installer/npm-installer.ts |

---

#### TASK-P2-003：实现 pip 安装源

| 字段 | 内容 |
|------|------|
| **所属模块** | 安装引擎 |
| **优先级** | 🟡 P2 |
| **前置依赖** | TASK-P2-001 |
| **详细描述** | 实现 PipInstaller：`install` 执行 `pip install <pkg>`（支持 `--user`）、`uninstall` 执行 `pip uninstall -y <pkg>`、`checkInstalled` 执行 `pip show <pkg>`，检测 Python 环境可用性 |
| **预估工时** | 1 人天 |
| **验收标准** | pip 包安装/卸载成功；无 Python 环境时优雅提示；安装后清单更新 |
| **交付物** | src/installer/pip-installer.ts |

---

#### TASK-P2-004：实现 GitHub Releases 安装源

| 字段 | 内容 |
|------|------|
| **所属模块** | 安装引擎 |
| **优先级** | 🟡 P2 |
| **前置依赖** | TASK-P2-001 |
| **详细描述** | 实现 GithubInstaller：通过 GitHub API 获取最新 release 信息，根据平台下载对应 asset（`.exe`/`.msi`/`.tar.gz`/`.zip`），解压并放置到 `~/.cli-manager/bin/` 目录，将该目录追加到 PATH（如不在 PATH 中）；支持 `--tag` 指定版本 |
| **预估工时** | 2 人天 |
| **验收标准** | 正确下载对应平台的 asset；下载过程显示进度条；解压/安装正确；自动添加 PATH |
| **交付物** | src/installer/github-installer.ts |

---

#### TASK-P2-005：实现 scoop/winget/choco 集成

| 字段 | 内容 |
|------|------|
| **所属模块** | 安装引擎 |
| **优先级** | 🟡 P2 |
| **前置依赖** | TASK-P2-001 |
| **详细描述** | 实现 ScoopInstaller（检测 scoop 存在后转发 `scoop install/update/uninstall` 命令）、WingetInstaller（转发 `winget install/uninstall`）、ChocoInstaller（转发 `choco install/uninstall`）；各安装器均支持检测自身包管理器是否可用 |
| **预估工时** | 1.5 人天 |
| **验收标准** | 各包管理器检测准确；转发命令正确执行；包管理器不可用时给出安装提示 |
| **交付物** | src/installer/scoop-installer.ts、src/installer/winget-installer.ts、src/installer/choco-installer.ts |

---

#### TASK-P2-006：实现安装配方引擎

| 字段 | 内容 |
|------|------|
| **所属模块** | 安装引擎 |
| **优先级** | 🟡 P2 |
| **前置依赖** | TASK-P2-001 |
| **详细描述** | 实现 Recipe 引擎：从 YAML 配方文件加载安装定义（工具名、安装源列表、版本检测命令、依赖），支持源回退（第一源失败自动试第二源），配方文件可从 `~/.cli-manager/recipes/` 和内置 recipes/ 目录加载 |
| **预估工时** | 2 人天 |
| **验收标准** | YAML 配方正确解析；多源回退生效；配方加载路径正确 |
| **交付物** | src/installer/recipe-engine.ts、src/recipe/loader.ts、src/recipe/registry.ts |

---

#### TASK-P2-007：实现 install 命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 安装引擎 |
| **优先级** | 🟡 P2 |
| **前置依赖** | TASK-P2-002 ~ TASK-P2-006、TASK-P0-002 |
| **详细描述** | 注册 `cli-manager install <name>` 命令：按优先级尝试各安装源（`--from` 指定来源，未指定时自动按配方检测），显示安装进度，安装成功后自动执行扫描更新清单；支持 `--dry-run`（预览安装计划不实际执行） |
| **预估工时** | 2 人天 |
| **验收标准** | 安装全流程可用（选择源→下载→安装→注册）；进度显示清晰；`--dry-run` 正确预览；失败时回退到次选源 |
| **交付物** | src/commands/install.ts |

---

#### TASK-P2-008：实现 uninstall 命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 安装引擎 |
| **优先级** | 🟡 P2 |
| **前置依赖** | TASK-P2-002 ~ TASK-P2-006、TASK-P0-002 |
| **详细描述** | 注册 `cli-manager uninstall <name>` 命令：根据工具来源调用对应卸载器，显示卸载进度，卸载后清理残留文件（配置文件、缓存、数据目录），最后更新清单 |
| **预估工时** | 1.5 人天 |
| **验收标准** | 正确按来源卸载；残留文件清理干净；卸载后清单更新 |
| **交付物** | src/commands/uninstall.ts |

---

#### TASK-P2-009：内置配方库

| 字段 | 内容 |
|------|------|
| **所属模块** | 安装引擎 |
| **优先级** | 🟡 P2 |
| **前置依赖** | TASK-P2-006 |
| **详细描述** | 编写 20+ 常用工具的 YAML 安装配方：git、node、python、gh、docker、docker-compose、rustup、go、java、ruby、php、composer、mongosh、redis-cli、aws-cli、azure-cli、gcloud、terraform、kubectl、helm、ffmpeg、imagemagick、jq、yq。每个配方包含名称、显示名、描述、分类、安装源列表、版本检测命令和正则 |
| **预估工时** | 2 人天 |
| **验收标准** | 内置配方 20+；每个配方 YAML 格式正确；配方可被配方引擎正确加载 |
| **交付物** | src/recipe/builtin/git.yml、node.yml、python.yml 等 20+ 配方文件 |

---

#### TASK-P2-010：实现配方管理 CLI 子命令（recipe CRUD）

| 字段 | 内容 |
|------|------|
| **所属模块** | 安装引擎 |
| **优先级** | 🟡 P2 |
| **前置依赖** | TASK-P2-006 |
| **详细描述** | 扩展 `recipe` 命令为完整子命令系统，支持自定义配方的增删改查：`list`（列出所有配方，内置+用户，用户配方优先）、`show <name>`（查看配方详情）、`add <name> --source <source> --exec <executable>`（添加用户自定义配方并写入 YAML）、`remove <name>`（删除用户自定义配方，内置配方只读不能删除）、`edit <name>`（打开编辑器修改配方，内置配方会自动复制到用户目录后编辑）。用户配方目录优先级：项目根目录 `recipes/` > `~/.cli-manager/recipes/` |
| **预估工时** | 2 人天 |
| **验收标准** | recipe list 正确区分用户/内置配方；add 成功写入 YAML；remove 仅删除用户配方；edit 启动编辑器并自动重载 |
| **交付物** | src/commands/install.ts 增强、src/recipe/registry.ts 增强 |

---

## 八、任务分解（P3 — 版本管理与更新）

---

#### TASK-P3-001：实现版本检测框架

| 字段 | 内容 |
|------|------|
| **所属模块** | 版本管理器 |
| **优先级** | 🔵 P3 |
| **前置依赖** | TASK-P0-004 |
| **详细描述** | 实现版本检测基础服务：从数据库读取工具列表，对每个工具执行版本检测命令（缓存 1 小时），使用 semver 解析和比较版本号，检测结果存入 version_history 表；支持 `--force` 强制刷新缓存 |
| **预估工时** | 1.5 人天 |
| **验收标准** | 版本检测准确；缓存机制生效；version_history 记录完整 |
| **交付物** | src/versioner/index.ts |

---

#### TASK-P3-002：实现版本切换（use 命令）

| 字段 | 内容 |
|------|------|
| **所属模块** | 版本管理器 |
| **优先级** | 🔵 P3 |
| **前置依赖** | TASK-P3-001、TASK-P2-001 |
| **详细描述** | 注册 `cli-manager use <name> <version>` 命令：对支持多版本的工具（如 Node.js 通过 nvm/fnm、Python 通过 pyenv）切换版本，对不支持多版本的工具通过安装指定版本实现切换；实现 `use <name>`（不带版本时交互式选择） |
| **预估工时** | 2 人天 |
| **验收标准** | 版本切换成功（切换后 `--version` 验证正确）；不支持的工具有友好提示；交互式选择可用 |
| **交付物** | src/commands/use.ts、src/versioner/switcher.ts |

---

#### TASK-P3-003：实现版本锁定（pin/unpin 命令）

| 字段 | 内容 |
|------|------|
| **所属模块** | 版本管理器 |
| **优先级** | 🔵 P3 |
| **前置依赖** | TASK-P3-001、TASK-P0-004 |
| **详细描述** | 注册 `cli-manager pin <name> [version]` 和 `cli-manager unpin <name>` 命令：将工具的 `isPinned` 和 `pinnedVersion` 字段写入数据库，锁定版本在批量更新时被跳过；`pin <name>` 不带版本时锁定当前版本 |
| **预估工时** | 1 人天 |
| **验收标准** | pin/unpin 操作正确写入数据库；批量更新时锁定版本跳过；锁定状态在 `list` 和 `info` 中可见 |
| **交付物** | src/versioner/pinner.ts、src/commands/pin.ts |

---

#### TASK-P3-004：实现 `version` 和 `list-versions` 命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 版本管理器 |
| **优先级** | 🔵 P3 |
| **前置依赖** | TASK-P3-001 |
| **详细描述** | 注册 `cli-manager version <name>`（显示当前版本和锁定状态）和 `cli-manager list-versions <name>`（查询该工具所有可用版本，npm 源通过 `npm view <pkg> versions`，pip 源通过 `pip index versions <pkg>`，GitHub 源通过 API）命令 |
| **预估工时** | 2 人天 |
| **验收标准** | 当前版本显示正确；可用版本列表完整（npm/pip/GitHub 各来源均支持）；查询超时处理安全 |
| **交付物** | src/commands/version.ts |

---

#### TASK-P3-005：实现 `update` 命令（单个更新）

| 字段 | 内容 |
|------|------|
| **所属模块** | 版本管理器 |
| **优先级** | 🔵 P3 |
| **前置依赖** | TASK-P3-001、TASK-P2-001 |
| **详细描述** | 注册 `cli-manager update <name>` 命令：检测工具的来源和当前版本，查询最新版本，如有更新则调用对应的安装源执行升级；显示更新前后的版本号变化；支持 `--dry-run` 预览 |
| **预估工时** | 1.5 人天 |
| **验收标准** | 更新流程完整（检测→确认→下载→安装→验证）；版本变更显示正确；`--dry-run` 预览准确 |
| **交付物** | src/commands/update.ts、src/versioner/updater.ts |

---

#### TASK-P3-006：实现 `update all` 批量更新

| 字段 | 内容 |
|------|------|
| **所属模块** | 版本管理器 |
| **优先级** | 🔵 P3 |
| **前置依赖** | TASK-P3-005 |
| **详细描述** | 扩展 `cli-manager update` 命令支持 `all` 子命令：遍历所有未锁定的工具，并行检测更新，生成批量更新计划，用户确认后批量执行升级；显示进度条和汇总报告（成功/失败/跳过数） |
| **预估工时** | 2 人天 |
| **验收标准** | 批量更新执行正确；锁定版本跳过；进度显示清晰；汇总报告完整 |
| **交付物** | src/commands/update.ts（增强） |

---

#### TASK-P3-007：实现 `rollback` 和 `history` 命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 版本管理器 |
| **优先级** | 🔵 P3 |
| **前置依赖** | TASK-P3-001、TASK-P0-004 |
| **详细描述** | 注册 `cli-manager rollback <name>` 命令：查询 version_history 获取上一个版本，调用安装器回退到该版本；`cli-manager history <name>` 命令：显示该工具的所有版本变更记录（时间、变更前版本、变更后版本、操作类型） |
| **预估工时** | 1.5 人天 |
| **验收标准** | rollback 正确回退到上一版本；history 记录完整可追溯；不支持的工具有提示 |
| **交付物** | src/commands/rollback.ts、src/commands/history.ts、src/versioner/history.ts |

---

## 九、任务分解（P4 — PATH 与环境管理）

---

#### TASK-P4-001：实现 PATH 解析与管理器

| 字段 | 内容 |
|------|------|
| **所属模块** | 环境管理器 |
| **优先级** | 🟢 P4 |
| **前置依赖** | TASK-P0-003 |
| **详细描述** | 实现 PATH 解析工具：跨平台读取当前 PATH 并解析为有序数组；检测每个路径是否存在、是否有可执行文件；检测重复路径和无效路径；支持用户级别 PATH 修改（Windows 通过 `setx`，Unix 通过 shell rc 文件） |
| **预估工时** | 2 人天 |
| **验收标准** | PATH 解析与系统一致；无效路径检测准确；用户级别 PATH 修改持久生效 |
| **交付物** | src/env/path-manager.ts |

---

#### TASK-P4-002：实现 `path` 命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 环境管理器 |
| **优先级** | 🟢 P4 |
| **前置依赖** | TASK-P4-001、TASK-P0-002 |
| **详细描述** | 注册 `cli-manager path` 子命令：`list`（按优先级表格展示所有 PATH 条目，标记状态：有效/无效/重复）、`check`（诊断并报告问题）、`add <dir>`（追加目录到用户 PATH）、`remove <dir>`（从 PATH 移除目录） |
| **预估工时** | 2 人天 |
| **验收标准** | path list 显示完整 PATH 树；path check 准确报告问题；add/remove 持久生效 |
| **交付物** | src/commands/path.ts |

---

#### TASK-P4-003：实现运行时环境检测

| 字段 | 内容 |
|------|------|
| **所属模块** | 环境管理器 |
| **优先级** | 🟢 P4 |
| **前置依赖** | TASK-P0-011 |
| **详细描述** | 检测系统中常见的运行时环境：Node.js、Python、Java、Go、Rust、.NET、Ruby、PHP 的版本、安装路径、是否在 PATH 中；输出格式化为表格 |
| **预估工时** | 1.5 人天 |
| **验收标准** | 运行时检测覆盖 8+ 种；版本信息准确；未安装的运行时正确标记 |
| **交付物** | src/env/runtime-detector.ts |

---

#### TASK-P4-004：实现环境变量管理

| 字段 | 内容 |
|------|------|
| **所属模块** | 环境管理器 |
| **优先级** | 🟢 P4 |
| **前置依赖** | TASK-P4-001 |
| **详细描述** | 实现环境变量查看和管理功能：`cli-manager env list`（列出所有与 CLI 工具相关的环境变量如 PATH、HOME、NODE_PATH、PYTHONPATH 等）、`env get <name>`（查看单个变量）、`env set <name> <value>`（设置用户级别环境变量） |
| **预估工时** | 1.5 人天 |
| **验收标准** | env list 显示相关变量；get/set 操作正确；Windows/Unix 跨平台兼容 |
| **交付物** | src/commands/env.ts、src/env/variable-manager.ts |

---

#### TASK-P4-005：实现 `doctor` 健康检查命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 环境管理器 |
| **优先级** | 🟢 P4 |
| **前置依赖** | TASK-P4-001、TASK-P4-003、TASK-P0-011 |
| **详细描述** | 注册 `cli-manager doctor` 命令：全面诊断系统环境健康度——检查 PATH 中的无效路径和重复项、检测关键运行时是否缺失、检测同名工具冲突、检测版本兼容性、检测数据库完整性；生成诊断报告（通过/警告/错误），对每个问题给出修复建议 |
| **预估工时** | 1.5 人天 |
| **验收标准** | 诊断覆盖 5+ 个维度；问题检测准确；修复建议可操作；报告格式清晰 |
| **交付物** | src/commands/doctor.ts、src/env/doctor.ts |

---

## 十、任务分解（P5 — 备份/恢复/统计）

---

#### TASK-P5-001：实现 `backup` 命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 备份恢复 |
| **优先级** | 🟣 P5 |
| **前置依赖** | TASK-P0-011、TASK-P0-012 |
| **详细描述** | 注册 `cli-manager backup` 命令：将所有已安装工具的清单（名称、版本、来源、分类、锁定状态）导出为 JSON 文件，默认路径 `~/.cli-manager/backups/cli-manager-backup-YYYY-MM-DD.json`；支持 `--output <path>` 指定导出路径 |
| **预估工时** | 1 人天 |
| **验收标准** | 备份 JSON 格式正确；包含所有工具的必要信息；文件名包含时间戳 |
| **交付物** | src/commands/backup.ts |

---

#### TASK-P5-002：实现 `restore` 命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 备份恢复 |
| **优先级** | 🟣 P5 |
| **前置依赖** | TASK-P5-001、TASK-P2-002 ~ TASK-P2-006 |
| **详细描述** | 注册 `cli-manager restore <file>` 命令：读取备份 JSON，对比当前已安装的工具，列出缺失的工具清单，用户确认后调用安装引擎批量安装对应版本；支持 `--dry-run` 预览安装计划 |
| **预估工时** | 2 人天 |
| **验收标准** | 备份文件正确解析；对比结果准确；批量安装流程可用；`--dry-run` 预览准确 |
| **交付物** | src/commands/restore.ts |

---

#### TASK-P5-003：实现 `sync` 多机同步命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 备份恢复 |
| **优先级** | 🟣 P5 |
| **前置依赖** | TASK-P5-001、TASK-P5-002 |
| **详细描述** | 注册 `cli-manager sync push`（将本机工具清单推送到远程存储，支持 Git 仓库或指定文件路径）和 `cli-manager sync pull`（从远程拉取清单并安装缺失工具）命令；支持 `--remote <url>` 指定远程地址 |
| **预估工时** | 2 人天 |
| **验收标准** | push/pull 操作正确；远程存储格式兼容；冲突处理合理 |
| **交付物** | src/commands/sync.ts |

---

#### TASK-P5-004：实现 `stats` 统计命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 统计报告 |
| **优先级** | 🟣 P5 |
| **前置依赖** | TASK-P0-011、TASK-P0-012 |
| **详细描述** | 注册 `cli-manager stats` 命令：计算并展示——工具总数、各来源占比、各分类占比、磁盘总占用（按分类排序）、版本提取成功率、最常用工具排行（如记录过使用频次）；支持 `--category` 分类筛选 |
| **预估工时** | 1.5 人天 |
| **验收标准** | 统计数据准确；展示格式美观；计算性能良好 |
| **交付物** | src/commands/stats.ts |

---

#### TASK-P5-005：实现 `report` 环境报告命令

| 字段 | 内容 |
|------|------|
| **所属模块** | 统计报告 |
| **优先级** | 🟣 P5 |
| **前置依赖** | TASK-P0-011、TASK-P4-003、TASK-P4-005 |
| **详细描述** | 注册 `cli-manager report` 命令：生成完整的系统环境报告——操作系统信息、Shell 信息、PATH 概览、所有已安装工具清单（含版本）、运行时版本、包管理器状态；支持 `--json`（JSON 格式，便于分享和调试）和 `--save <path>`（保存到文件）；报告顶部包含分享提示（不含敏感信息） |
| **预估工时** | 1.5 人天 |
| **验收标准** | 报告信息全面；JSON 格式完整可解析；敏感信息过滤正确；`--save` 写入成功 |
| **交付物** | src/commands/report.ts |

---

## 十一、任务分解（P6 — 用户体验增强）

---

#### TASK-P6-001：实现交互式 Shell 模式

| 字段 | 内容 |
|------|------|
| **所属模块** | 用户体验 |
| **优先级** | ⚪ P6 |
| **前置依赖** | TASK-P0-002、所有命令实现 |
| **详细描述** | 无参数运行 `cli-manager` 时进入交互式 Shell 模式：显示提示符 `cli-manager> `，支持 Tab 补全（命令/子命令/参数/工具名），支持上下键历史记录，支持 `exit`/`quit` 退出，支持 `help` 列出所有命令，内置 REPL 循环读取/解析/执行 |
| **预估工时** | 3 人天 |
| **验收标准** | 交互式 Shell 可用；Tab 补全正确；历史记录持久化；所有命令在 Shell 中可执行 |
| **交付物** | src/commands/interactive.ts、src/ui/prompt.ts |

---

#### TASK-P6-002：生成 Shell 自动补全脚本

| 字段 | 内容 |
|------|------|
| **所属模块** | 用户体验 |
| **优先级** | ⚪ P6 |
| **前置依赖** | TASK-P0-002 |
| **详细描述** | 实现 `cli-manager completion` 命令：`completion powershell` 生成 PowerShell 补全脚本、`completion bash` 生成 bash 补全脚本、`completion zsh` 生成 zsh 补全脚本；补全内容包括所有命令、子命令、参数、以及动态从数据库读取的工具名列表 |
| **预估工时** | 2 人天 |
| **验收标准** | 三种 Shell 的补全脚本语法正确；补全内容覆盖命令/参数/工具名；安装指南清晰 |
| **交付物** | src/completion/powershell.ts、src/completion/bash.ts、src/completion/zsh.ts、src/commands/completion.ts |

---

#### TASK-P6-003：实现进度指示器系统

| 字段 | 内容 |
|------|------|
| **所属模块** | 用户体验 |
| **优先级** | ⚪ P6 |
| **前置依赖** | TASK-P0-012 |
| **详细描述** | 基于 ora 库封装统一的进度指示器模块：支持 spinner（不确定时长任务）、progress bar（确定时长任务，如下载）、多任务并行进度显示；在 install/update/backup/scan 等长时间操作中使用 |
| **预估工时** | 1 人天 |
| **验收标准** | spinner/progress bar 在不同操作中正确显示；非 TTY 环境自动降级为文本输出 |
| **交付物** | src/ui/spinner.ts（在各命令中集成） |

---

#### TASK-P6-004：实现初始化配置向导

| 字段 | 内容 |
|------|------|
| **所属模块** | 用户体验 |
| **优先级** | ⚪ P6 |
| **前置依赖** | TASK-P0-013、TASK-P0-010 |
| **详细描述** | 首次运行 `cli-manager` 时检测到无配置/无数据库，自动启动交互式初始化向导：选择安装源（npm/pip/GitHub/scoop/winget/choco）、选择扫描频率（每日/每周/手动）、选择输出格式偏好（table/json/text）、选择颜色主题；向导结束后执行首次全量扫描 |
| **预估工时** | 2 人天 |
| **验收标准** | 首次运行自动触发向导；向导步骤清晰可跳过；配置保存后生效；向导后自动执行扫描 |
| **交付物** | src/commands/init.ts、src/ui/prompt.ts（增强） |

---

#### TASK-P6-005：实现插件系统框架

| 字段 | 内容 |
|------|------|
| **所属模块** | 用户体验 |
| **优先级** | ⚪ P6 |
| **前置依赖** | TASK-P0-002 |
| **详细描述** | 设计插件接口（`CliPlugin`：`name`、`version`、`commands`、`hooks` 生命周期），实现插件加载器（从 `~/.cli-manager/plugins/` 目录加载），实现插件注册机制（插件可以注册新命令和扩展已有命令），提供插件开发示例 |
| **预估工时** | 3 人天 |
| **验收标准** | 插件接口定义清晰；插件加载/卸载正确；插件可注册新命令；示例插件可运行 |
| **交付物** | src/plugins/（框架目录）、示例插件文件 |

---

#### TASK-P6-006：实现 Web 管理面板（基础版）

| 字段 | 内容 |
|------|------|
| **所属模块** | 用户体验 |
| **优先级** | ⚪ P6 |
| **前置依赖** | 所有命令实现完成 |
| **详细描述** | 基于 Node.js 内置 HTTP 服务器（或 Express）实现轻量级 Web 面板：`cli-manager web --port 8080` 启动本地 Web 服务；前端为单页 HTML（内联 CSS/JS），功能包括——工具列表展示（搜索/过滤/分页）、工具详情查看、一键更新、工具统计仪表盘图表（Chart.js CDN） |
| **预估工时** | 3 人天 |
| **验收标准** | Web 面板可启动访问；列表/搜索/过滤功能可用；统计图表展示正确；API 接口设计合理 |
| **交付物** | src/commands/web.ts、src/web/（面板资源） |

---

#### TASK-P6-007：实现 TUI 仪表盘

| 字段 | 内容 |
|------|------|
| **所属模块** | 用户体验 |
| **优先级** | ⚪ P6 |
| **前置依赖** | TASK-P0-011、TASK-P1-004 |
| **详细描述** | 实现 `cli-manager dashboard` 命令：基于 blessed/blessed-contrib 库实现终端 UI 仪表盘——工具总数仪表、来源分布饼图、分类分布柱状图、待更新列表、最近操作日志、实时状态刷新（每 30s）；支持键盘快捷键（q 退出、r 刷新） |
| **预估工时** | 3 人天 |
| **验收标准** | TUI 仪表盘可启动；图表展示正确；实时刷新正常；键盘快捷键响应 |
| **交付物** | src/commands/dashboard.ts |

---

## 十二、总任务汇总表

### 12.1 按阶段统计

| 阶段 | 任务数 | 总预估工时 | 所属优先级 |
|------|--------|-----------|-----------|
| 阶段 0-1：项目初始化与基础框架 | 4 | 3 人天 | 🔴 P0 |
| 阶段 0-2：工具发现引擎 | 6 | 8.5 人天 | 🔴 P0 |
| 阶段 0-3：工具扫描命令 | 3 | 3.5 人天 | 🔴 P0 |
| **P0 小计** | **13** | **15 人天** | |
| 阶段 1：工具展示与查询 | 6 | 9 人天 | 🟠 P1 |
| **P1 小计** | **6** | **9 人天** | |
| 阶段 2：安装与卸载 | 9 | 13.5 人天 | 🟡 P2 |
| **P2 小计** | **9** | **13.5 人天** | |
| 阶段 3：版本管理与更新 | 7 | 11.5 人天 | 🔵 P3 |
| **P3 小计** | **7** | **11.5 人天** | |
| 阶段 4：PATH 与环境管理 | 5 | 8.5 人天 | 🟢 P4 |
| **P4 小计** | **5** | **8.5 人天** | |
| 阶段 5：备份/恢复/统计 | 5 | 8 人天 | 🟣 P5 |
| **P5 小计** | **5** | **8 人天** | |
| 阶段 6：用户体验增强 | 7 | 17 人天 | ⚪ P6 |
| **P6 小计** | **7** | **17 人天** | |
| **总计** | **52 个任务** | **83 人天** | |

### 12.2 完整任务清单速查表

| 任务ID | 名称 | 优先级 | 预估工时 | 前置依赖 |
|--------|------|--------|----------|----------|
| TASK-P0-001 | 初始化 Node.js/TypeScript 项目 | 🔴 P0 | 0.5d | 无 |
| TASK-P0-002 | 实现 CLI 入口与命令路由 | 🔴 P0 | 0.5d | TASK-P0-001 |
| TASK-P0-003 | 实现工具信息数据模型 | 🔴 P0 | 0.5d | TASK-P0-001 |
| TASK-P0-004 | 实现 SQLite 数据库层 | 🔴 P0 | 1.5d | TASK-P0-003 |
| TASK-P0-005 | 实现 PATH 目录遍历扫描器 | 🔴 P0 | 2d | TASK-P0-003、TASK-P0-004 |
| TASK-P0-006 | 实现 npm 全局包扫描器 | 🔴 P0 | 1d | TASK-P0-005 |
| TASK-P0-007 | 实现 pip 包扫描器 | 🔴 P0 | 1d | TASK-P0-005 |
| TASK-P0-008 | 实现版本号自动提取器 | 🔴 P0 | 1.5d | TASK-P0-005 |
| TASK-P0-009 | 实现元数据采集与来源分类 | 🔴 P0 | 1.5d | TASK-P0-005 ~ P0-007 |
| TASK-P0-010 | 实现全量扫描与增量扫描 | 🔴 P0 | 1.5d | TASK-P0-005 ~ P0-009、P0-004 |
| TASK-P0-011 | 实现 scan 命令 | 🔴 P0 | 1d | TASK-P0-002、TASK-P0-010 |
| TASK-P0-012 | 实现帮助与输出格式化系统 | 🔴 P0 | 1.5d | TASK-P0-002 |
| TASK-P0-013 | 实现配置管理子模块 | 🔴 P0 | 1d | TASK-P0-004 |
| TASK-P1-001 | 实现 list 命令 | 🟠 P1 | 2d | TASK-P0-011、TASK-P0-012 |
| TASK-P1-002 | 实现 info 命令 | 🟠 P1 | 1.5d | TASK-P0-011、TASK-P0-012 |
| TASK-P1-003 | 实现 which 命令 | 🟠 P1 | 1d | TASK-P0-011、TASK-P0-012 |
| TASK-P1-004 | 实现 status 命令 | 🟠 P1 | 1.5d | TASK-P0-011、TASK-P0-012 |
| TASK-P1-005 | 实现 outdated 命令 | 🟠 P1 | 1.5d | TASK-P0-011、TASK-P0-012、TASK-P3-001 |
| TASK-P1-006 | 实现分类管理（category 命令） | 🟠 P1 | 1.5d | TASK-P0-011、TASK-P0-012 |
| TASK-P2-001 | 实现安装引擎框架 | 🟡 P2 | 1.5d | TASK-P0-002、TASK-P0-012 |
| TASK-P2-002 | 实现 npm 安装源 | 🟡 P2 | 1d | TASK-P2-001 |
| TASK-P2-003 | 实现 pip 安装源 | 🟡 P2 | 1d | TASK-P2-001 |
| TASK-P2-004 | 实现 GitHub Releases 安装源 | 🟡 P2 | 2d | TASK-P2-001 |
| TASK-P2-005 | 实现 scoop/winget/choco 集成 | 🟡 P2 | 1.5d | TASK-P2-001 |
| TASK-P2-006 | 实现安装配方引擎 | 🟡 P2 | 2d | TASK-P2-001 |
| TASK-P2-007 | 实现 install 命令 | 🟡 P2 | 2d | TASK-P2-002 ~ P2-006、TASK-P0-002 |
| TASK-P2-008 | 实现 uninstall 命令 | 🟡 P2 | 1.5d | TASK-P2-002 ~ P2-006、TASK-P0-002 |
| TASK-P2-009 | 内置配方库（20+ 工具配方） | 🟡 P2 | 2d | TASK-P2-006 |
| TASK-P3-001 | 实现版本检测框架 | 🔵 P3 | 1.5d | TASK-P0-004 |
| TASK-P3-002 | 实现版本切换（use 命令） | 🔵 P3 | 2d | TASK-P3-001、TASK-P2-001 |
| TASK-P3-003 | 实现版本锁定（pin/unpin） | 🔵 P3 | 1d | TASK-P3-001、TASK-P0-004 |
| TASK-P3-004 | 实现 version/list-versions 命令 | 🔵 P3 | 2d | TASK-P3-001 |
| TASK-P3-005 | 实现 update 命令（单个更新） | 🔵 P3 | 1.5d | TASK-P3-001、TASK-P2-001 |
| TASK-P3-006 | 实现 update all 批量更新 | 🔵 P3 | 2d | TASK-P3-005 |
| TASK-P3-007 | 实现 rollback/history 命令 | 🔵 P3 | 1.5d | TASK-P3-001、TASK-P0-004 |
| TASK-P4-001 | 实现 PATH 解析与管理器 | 🟢 P4 | 2d | TASK-P0-003 |
| TASK-P4-002 | 实现 path 命令 | 🟢 P4 | 2d | TASK-P4-001、TASK-P0-002 |
| TASK-P4-003 | 实现运行时环境检测 | 🟢 P4 | 1.5d | TASK-P0-011 |
| TASK-P4-004 | 实现环境变量管理 | 🟢 P4 | 1.5d | TASK-P4-001 |
| TASK-P4-005 | 实现 doctor 健康检查命令 | 🟢 P4 | 1.5d | TASK-P4-001、P4-003、P0-011 |
| TASK-P5-001 | 实现 backup 命令 | 🟣 P5 | 1d | TASK-P0-011、TASK-P0-012 |
| TASK-P5-002 | 实现 restore 命令 | 🟣 P5 | 2d | TASK-P5-001、TASK-P2-002 ~ P2-006 |
| TASK-P5-003 | 实现 sync 多机同步命令 | 🟣 P5 | 2d | TASK-P5-001、TASK-P5-002 |
| TASK-P5-004 | 实现 stats 统计命令 | 🟣 P5 | 1.5d | TASK-P0-011、TASK-P0-012 |
| TASK-P5-005 | 实现 report 环境报告命令 | 🟣 P5 | 1.5d | TASK-P0-011、P4-003、P4-005 |
| TASK-P6-001 | 实现交互式 Shell 模式 | ⚪ P6 | 3d | TASK-P0-002、所有命令 |
| TASK-P6-002 | 生成 Shell 自动补全脚本 | ⚪ P6 | 2d | TASK-P0-002 |
| TASK-P6-003 | 实现进度指示器系统 | ⚪ P6 | 1d | TASK-P0-012 |
| TASK-P6-004 | 实现初始化配置向导 | ⚪ P6 | 2d | TASK-P0-013、TASK-P0-010 |
| TASK-P6-005 | 实现插件系统框架 | ⚪ P6 | 3d | TASK-P0-002 |
| TASK-P6-006 | 实现 Web 管理面板（基础版） | ⚪ P6 | 3d | 所有命令实现完成 |
| TASK-P6-007 | 实现 TUI 仪表盘 | ⚪ P6 | 3d | TASK-P0-011、TASK-P1-004 |

---

## 十三、里程碑与发布计划

### 13.1 里程碑

| 里程碑 | 聚焦任务 | 预计工期 | 交付物 |
|--------|----------|----------|--------|
| **M1 — MVP** | P0 全部 + P1 部分 | 3 周 | `scan`、`list`、`info`、`which`、`status` 命令可用；能扫描并展示所有工具 |
| **M2 — 安装能力** | P1 剩余 + P2 | 3 周 | `install`、`uninstall`、`category`、`outdated` 命令可用；支持多源安装 |
| **M3 — 版本管理** | P3 + P4 | 3 周 | `update`、`use`、`pin`、`path`、`doctor` 命令可用；版本管理和环境诊断 |
| **M4 — 完整版** | P5 | 1 周 | `backup`、`restore`、`sync`、`stats`、`report` 命令可用 |
| **M5 — 体验版** | P6 | 2 周 | 交互式 Shell、自动补全、Web 面板、TUI 仪表盘 |
| **合计** | 全部 52 个任务 | **~12 周（3 个月）** | |

### 13.2 发布版本规划

| 版本 | 对应里程碑 | 标签 | 说明 |
|------|-----------|------|------|
| v0.1.0 | M1 | alpha | 内部测试版，基础扫描和展示 |
| v0.2.0 | M2 | alpha | 安装卸载能力 |
| v0.3.0 | M3 | beta | 版本管理和环境诊断 |
| v0.4.0 | M4 | beta | 备份恢复和统计 |
| v1.0.0 | M5 | stable | 正式版，全功能 + 体验优化 |

### 13.3 交付检查清单

每个里程碑交付前需验证：

- [ ] 所有计划的 TASK 已完成并通过单元测试
- [ ] 命令 `--help` 文档完整
- [ ] 彩色输出 / `--no-color` / `--format` 正常
- [ ] Windows + 至少一个 Unix 平台测试通过
- [ ] 错误处理覆盖常见异常场景
- [ ] 无明显性能问题（扫描 1000+ 工具 < 10s）
- [ ] CHANGELOG 更新

---

## 附录 A：测试策略

| 测试级别 | 工具 | 覆盖率目标 | 说明 |
|----------|------|-----------|------|
| 单元测试 | vitest | ≥ 80% | 核心逻辑：扫描器、安装器、版本管理器 |
| 集成测试 | vitest | ≥ 60% | 命令流程：install→scan→list→update |
| E2E 测试 | 手动 | 关键路径 | 在 Windows/Linux/macOS 上验证完整流程 |
| 快照测试 | vitest | 输出格式 | 确保输出格式不变 |

## 附录 B：关键设计决策记录

| 决策 ID | 决策 | 选项 | 结论 | 理由 |
|---------|------|------|------|------|
| ADR-001 | 数据存储 | JSON vs SQLite vs LevelDB | SQLite | 性能好，支持事务和复杂查询 |
| ADR-002 | CLI 框架 | commander vs yargs vs oclif | commander | 成熟、轻量、社区活跃 |
| ADR-003 | 扫描策略 | 实时 vs 定时 vs 手动 | 全量+增量 | 首次全量，后续增量，兼顾速度和完整性 |
| ADR-004 | 安装方式 | 代理转发 vs 直接调用 | 直接调用 | 避免版本耦合，直接使用原生包管理器 |
| ADR-005 | 配置目录 | XDG vs ~/.cli-manager | ~/.cli-manager | 简单直接，跨平台一致 |

## 附录 C：风险管理

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|----------|
| Windows PATH 修改权限不足 | 中 | 高 | 提供管理员提示和手动操作指南 |
| npm/pip 扫描性能慢 | 中 | 中 | 增加缓存机制和超时控制 |
| GitHub API 限流 | 高 | 中 | 支持 Token 认证，缓存 API 响应 |
| 跨平台兼容问题 | 中 | 高 | CI 覆盖 Windows/Linux/macOS 三个平台 |
| 版本检测命令导致工具崩溃 | 低 | 高 | 沙箱执行，超时控制，白名单机制 |
