# CLI Manager 开发路线图

> 本文档将长期目标拆分为最小可执行任务单元。每个任务包含：目标、涉及文件、验收标准、预计工作量。
> 优先级：P0（必须）> P1（应该）> P2（可以）> P3（未来）

---

## v0.2.1 — 补齐短板（当前 Sprint）

### TASK-0.2.1-A：Web 面板操作深度增强
**优先级：P0 | 预计工作量：2h**

#### 目标
让 Web 面板能直接完成 pin/unpin、查看工具详情、触发扫描等操作，而非仅展示数据。

#### 最小任务单元

| 任务 ID | 任务描述 | 涉及文件 | 验收标准 |
|---------|----------|----------|----------|
| A1 | 后端新增 `POST /api/tools/:id/pin` | `src/commands/web.ts` | 请求体 `{version?: string}`，成功返回 pinnedVersion，失败返回 400 |
| A2 | 后端新增 `POST /api/tools/:id/unpin` | `src/commands/web.ts` | 清除 isPinned 和 pinnedVersion，返回成功消息 |
| A3 | 后端新增 `GET /api/tools/:id` | `src/commands/web.ts` | 返回单个工具完整信息（含 versionHistory 最近 5 条） |
| A4 | 前端工具表格增加「锁定/解锁」按钮 | `src/commands/web.html` | 每行末尾显示 🔒/解锁图标，点击调用 pin/unpin API |
| A5 | 前端工具详情弹窗 | `src/commands/web.html` | 点击工具名弹出 modal，显示 fullPath、version、source、category、fileSize、modifiedAt、历史版本记录 |
| A6 | 前端操作后自动刷新 | `src/commands/web.html` | pin/unpin/详情关闭后自动 reloadData() |

#### 实现提示
- pin/unpin 直接调用 `toolRepo.updatePinStatus(id, isPinned, version?)`
- 版本历史通过 `historyRepo.getVersionHistory(name, 5)` 获取
- modal 用纯 CSS/JS 实现（已有多标签页 UI 框架）

---

### TASK-0.2.1-B：测试覆盖补齐
**优先级：P0 | 预计工作量：3h**

#### 目标
将 commands/ 和 db/ 层测试覆盖率从 ~15% 提升到 60%+。

#### 最小任务单元

| 任务 ID | 任务描述 | 涉及文件 | 验收标准 |
|---------|----------|----------|----------|
| B1 | 为 ToolRepo 添加 CRUD 单测 | `tests/db/tool-repo.test.ts`（新建） | 覆盖 upsert/findAll/findByName/findBySource/search/count/delete/pin |
| B2 | 为 HistoryRepo 添加单测 | `tests/db/history-repo.test.ts`（新建） | 覆盖 addScanHistory/getScanHistory/getLastScan/addVersionChange/getVersionHistory |
| B3 | 为 ConfigRepo 添加单测 | `tests/db/config-repo.test.ts`（新建） | 覆盖 get/set/getScanInterval/isColorEnabled |
| B4 | 为 scan 命令添加集成测试 | `tests/commands/scan.test.ts`（新建） | mock Scanner，验证 initDatabase + scanCommand 输出 |
| B5 | 为 install 命令添加集成测试 | `tests/commands/install.test.ts`（新建） | mock installer，验证 recipe fallback 逻辑 |
| B6 | 为 web 命令添加 API 集成测试 | `tests/commands/web.test.ts`（新建） | 启动 HTTP 服务，请求 /api/tools /api/stats 验证响应 |
| B7 | 集成测试辅助工具 | `tests/helpers.ts`（新建） | 提供 createTestDb() / cleanupTestDb() 工具函数 |

#### 实现提示
- 使用 `beforeEach/afterEach` 管理内存数据库
- Web 集成测试用 `node:http` 请求，避免启动浏览器
- 覆盖率 gate：`vitest --coverage` 要求 statements ≥ 60%

---

### TASK-0.2.1-C：更多 upstream 适配
**优先级：P1 | 预计工作量：2h**

#### 目标
outdated 命令支持 winget、scoop、choco 的上游版本检测（或优雅降级）。

#### 最小任务单元

| 任务 ID | 任务描述 | 涉及文件 | 验收标准 |
|---------|----------|----------|----------|
| C1 | winget 上游检测 | `src/scanner/upstream.ts` | 使用 `winget show <id> --versions` 解析可用版本列表，取最新版 |
| C2 | scoop 上游检测 | `src/scanner/upstream.ts` | 访问 scoop bucket API（如 `https://scoop-zapps.vercel.app/apps.json`）或降级提示 |
| C3 | choco 上游检测 | `src/scanner/upstream.ts` | 使用 `choco list <pkg> --local-only --exact` 或 Chocolatey API |
| C4 | 系统自带工具降级处理 | `src/scanner/upstream.ts` | system 来源返回 `{detectable: false, reason: 'system binary'}`，前端显示「无法自动检测」 |
| C5 | outdated 表格适配新来源 | `src/commands/outdated.ts` | winget/scoop/choco 检测成功则显示版本，失败则显示「-」并标注原因 |

#### 实现提示
- winget/scoop/choco 检测失败时**不抛错**，静默降级
- 超时设置 5 秒，避免阻塞 outdated 执行
- 批量检测时使用 `Promise.allSettled` 隔离失败

---

## v0.3.0 — 独立与团队（短期目标）

### TASK-0.3.0-A：独立二进制发布
**优先级：P0 | 预计工作量：3h**

#### 目标
用户无需 Node.js 环境，直接下载 `cli-manager.exe` 即可运行。

#### 最小任务单元

| 任务 ID | 任务描述 | 涉及文件 | 验收标准 |
|---------|----------|----------|----------|
| A1 | ncc 预编译配置 | `.github/workflows/release.yml` | 已有基础，需补充 Windows/Linux/macOS 三平台构建 |
| A2 | 处理 better-sqlite3 原生模块 | `scripts/bundle-html.js` + release.yml | ncc 打包时自动包含 `.node` 二进制 |
| A3 | 生成各平台启动脚本 | `scripts/release.js`（新建） | Windows 生成 `cli-manager.exe`，Unix 生成 `cli-manager` + shebang |
| A4 | 安装包脚本 | `scripts/install.sh` / `install.ps1` | 用户一行命令安装：`curl \| sh` 或 PowerShell 下载 |
| A5 | 更新 package.json bin | `package.json` | 保留 `bin` 字段，增加 `bin.ncc` 指向 ncc 产物 |

#### 验收命令
```bash
pnpm build
ncc build dist/index.js -o dist/ncc/
./dist/ncc/cli-manager --version
```

---

### TASK-0.3.0-B：团队同步（.tool-versions + git）
**优先级：P1 | 预计工作量：4h**

#### 目标
支持 asdf 兼容的 `.tool-versions` 导入导出，以及 `.cli-manager/config.json` Git 集成。

#### 最小任务单元

| 任务 ID | 任务描述 | 涉及文件 | 验收标准 |
|---------|----------|----------|----------|
| B1 | 定义 .tool-versions 格式 | `src/types/sync.ts`（新建） | 每行 `tool version`，支持注释 |
| B2 | 导出命令 `cli-manager sync export` | `src/commands/sync.ts` | 生成 `.tool-versions`，仅包含 pinned 工具 |
| B3 | 导入命令 `cli-manager sync import` | `src/commands/sync.ts` | 读取 `.tool-versions`，执行 pin 操作 |
| B4 | Git 集成检测 | `src/commands/sync.ts` | 检测当前目录是否在 Git 仓库中 |
| B5 | `.cli-manager/config.json` Git 忽略 | `docs/SYNC.md` | 文档说明建议将 config.json 加入 .gitignore |
| B6 | `cli-manager sync push/pull` | `src/commands/sync.ts` | push 提交 config.json 到当前 Git 仓库，pull 拉取并合并 |

#### 实现提示
- `.tool-versions` 兼容 asdf 格式，方便团队迁移
- Git 集成只操作 `config.json`，不操作 SQLite 数据库文件

---

### TASK-0.3.0-C：配方数量目标 50+
**优先级：P1 | 预计工作量：6h**

#### 目标
内置配方从 24 个扩展到 50+，覆盖主流开发工具。

#### 最小任务单元

| 任务 ID | 任务描述 | 涉及文件 | 验收标准 |
|---------|----------|----------|----------|
| C1 | 新增 DevOps 类配方 | `src/recipe/builtin/*.yml`（新建） | ansible, helm, k9s, kubectx, stern, terraform, vault, jq, yq（已有部分） |
| C2 | 新增 AI/ML 类配方 | `src/recipe/builtin/*.yml`（新建） | ollama, llama.cpp, whisper, stable-diffusion, pytorch |
| C3 | 新增 Database 类配方 | `src/recipe/builtin/*.yml`（新建） | mongodb, postgresql, mysql, redis, sqlite |
| C4 | 新增 Container 类配方 | `src/recipe/builtin/*.yml`（新建） | docker-compose, podman, kind, minikube |
| C5 | 配方模板标准化 | `docs/RECIPES.md` | 每个配方必须包含：category、description、sources（至少 2 个包管理器）、versionCmd、versionRegex |

#### 配方规范
```yaml
name: <工具名>
displayName: <显示名>
description: <一句话描述>
category: dev|ai|system|editor|other|database|devops
sources:
  - type: winget
    packageName: <winget包名>
    executableName: <可执行文件名>
  - type: choco
    packageName: <choco包名>
    executableName: <可执行文件名>
versionCmd: <版本检测命令>
versionRegex: <正则提取版本号>
postInstall: # 可选
  - <安装后执行的命令>
```

---

## v0.4.0 - v0.9 — 中期迭代

### TASK-0.4.0-A：插件市场（远程配方源）
**优先级：P2 | 预计工作量：8h**

#### 目标
支持从 GitHub 官方仓库或第三方源安装配方。

| 任务 ID | 任务描述 | 涉及文件 |
|---------|----------|----------|
| A1 | 远程配方源接口定义 | `src/recipe/remote-source.ts` |
| A2 | GitHub 配方源适配 | 读取 `arwei944/cli-manager-recipes` 仓库 |
| A3 | `cli-manager recipe install <remote>` | `src/commands/install.ts` |
| A4 | 配方源信任校验 | 内置签名机制，防止恶意配方 |

---

### TASK-0.4.0-B：定时任务
**优先级：P2 | 预计工作量：4h**

| 任务 ID | 任务描述 | 涉及文件 |
|---------|----------|----------|
| B1 | 定时任务接口 | `src/scheduler/task.ts` |
| B2 | 基于 Node.js 的 cron 实现 | 使用 `node-cron` 或 `cron` 包 |
| B3 | `cli-manager schedule <cron>` | `src/commands/schedule.ts` |
| B4 | 持久化定时任务到 SQLite | `src/db/scheduled-tasks.ts` |

---

### TASK-0.4.0-C：Shell 版本切换
**优先级：P2 | 预计工作量：6h**

| 任务 ID | 任务描述 | 涉及文件 |
|---------|----------|----------|
| C1 | Shell hook 脚本 | `src/completion/shell-init.ts` |
| B2 | 版本切换逻辑（类比 rbenv） | `src/commands/use.ts` 增强 |
| C3 | 支持多语言版本管理 | Node.js、Python、Go 等 |

---

### TASK-0.4.0-D：性能优化（大 PATH 增量扫描）
**优先级：P2 | 预计工作量：4h**

| 任务 ID | 任务描述 | 涉及文件 |
|---------|----------|----------|
| D1 | 文件系统 mtime 缓存 | `src/scanner/path-scanner.ts` |
| D2 | 增量扫描算法 | `src/scanner/index.ts` |
| D3 | 扫描进度条 | `src/ui/spinner.ts` |
| D4 | 大 PATH（>500）分片处理 | `src/utils/path.ts` |

---

## v1.0.0 — 里程碑

### TASK-1.0.0-A：多语言版本管理
**优先级：P0 | 预计工作量：10h**

- 统一接口 `IVersionManager`（install/use/remove/list）
- Node.js、Python、Go、Rust、Java 适配器
- 版本解析标准（SemVer）

### TASK-1.0.0-B：稳定 API（HTTP API + WebSocket）
**优先级：P0 | 预计工作量：8h**

- RESTful API 版本化（/api/v1/...）
- WebSocket 实时推送（扫描进度、操作日志）
- API 文档（OpenAPI 3.0）

### TASK-1.0.0-C：完整文档站点
**优先级：P1 | 预计工作量：6h**

- 使用 VitePress 或 Docusaurus
- 命令文档、配方规范、插件开发指南、API 文档

### TASK-1.0.0-D：社区生态
**优先级：P1 | 预计工作量：持续**

- 配方数量 ≥ 100
- 插件模板仓库
- 贡献指南（CONTRIBUTING.md）
- Good First Issue 标签

---

## 执行优先级总结

```
Sprint 1（本周）
  ✅ A1-A6: Web 面板操作深度增强
  ✅ B1-B7: 测试覆盖补齐
  ✅ C1-C5: 更多 upstream 适配

Sprint 2（2周内）
  A1-A5: ncc 独立二进制
  B1-B6: 团队同步

Sprint 3（1个月内）
  C1-C5: 配方扩展到 50+
  A1-C3: Shell 版本切换

Sprint 4+（下季度）
  插件市场 + 定时任务 + 性能优化
```

---

## 快速导航

- [开发文档](DEVELOPMENT.md)
- [命令文档](COMMANDS.md)
- [配方文档](RECIPES.md)
- [插件文档](PLUGINS.md)
- [GitHub Issues](https://github.com/arwei944/cli-manager/issues)

---

*最后更新：2026-06-19*
