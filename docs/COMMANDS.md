# 命令说明

## outdated

检查已安装工具是否有上游更新，并列出可更新的工具列表。

```
cli-manager outdated [options]
```

### 选项

- `--source <source>`：仅检查指定来源的工具（支持 npm、pip、gh等）
- `--json`：以 JSON 格式输出结果

### 输出格式

默认输出表格：

```
名称       来源   当前版本   最新版本
──────────────────────────────────
eslint     npm   8.0.0      8.57.0
```

使用 `--json` 参数时，输出标准 JSON 字段：
- `name`：工具名称
- `source`：安装来源
- `currentVersion`：本地版本
- `latestVersion`：上游最新版本
- `hasUpdate`：是否可用更新（布尔值）

`system` 和 `manual` 类工具会自动跳过，`winget`、`scoop`、`choco` 来源暂降级为"无法自动检测"。

---

## update

更新已安装的工具到最新版本。

```
cli-manager update [name] [options]
```

### 参数

- `name`：可选，指定要更新的单个工具名称，不指定则批量更新所有可更新工具

### 选项

- `--dry-run`：仅预览，不执行实际操作
- `--source <source>`：更新时使用指定来源（单个更新时生效）

### 更新策略

- **npm/pip**：调用安装器的 `install` 方法覆盖安装（自动使用 `--upgrade` 或版本号参数）
- **GitHub (gh)**：使用 `gh release download` 下载最新 Release 替换本地二进制
- **system / choco**：不支持自动更新，输出提示信息

### 更新后行为

更新成功后自动执行增量扫描（`scan incremental`），刷新本地工具清单中的版本号，并记录变更历史。

### 示例

```bash
# 检查哪些工具有更新
cli-manager outdated

# 使用 JSON 格式检查
cli-manager outdated --json

# 仅检查 npm 工具
cli-manager outdated --source npm

# 更新单个工具
cli-manager update eslint

# 批量更新所有可更新工具
cli-manager update

# 批量预览，不实际更新
cli-manager update --dry-run
```
