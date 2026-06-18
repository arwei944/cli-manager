export function generatePowershellCompletion(): string {
  return `# CLI Manager PowerShell 自动补全脚本
# 安装方法: 将此文件保存到 $PROFILE 目录，或在 $PROFILE 中添加:
# . "$env:USERPROFILE\\.cli-manager\\completion\\cli-manager.ps1"

Register-ArgumentCompleter -Native -CommandName 'cli-manager' -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $commands = @(
        'scan', 'config', 'list', 'info', 'which', 'status', 'outdated',
        'category', 'install', 'uninstall', 'update', 'version', 'use',
        'pin', 'unpin', 'rollback', 'history', 'path', 'env', 'doctor',
        'backup', 'restore', 'stats', 'report', 'sync', 'help'
    )

    $globalOptions = @('--help', '--version', '--no-color', '--format')

    # 获取当前命令行参数
    $elements = $commandAst.CommandElements
    $currentCommand = if ($elements.Count -gt 1) { $elements[1].Value } else { '' }

    # 如果还在输入主命令
    if ($wordToComplete -and -not $currentCommand) {
        $commands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
        return
    }

    # 全局选项补全
    $globalOptions | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
        [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterName', $_)
    }

    # 子命令补全
    $subCommands = @{
        'config'   = @('get', 'set', 'list')
        'category' = @('list', 'set', 'unset')
        'path'     = @('list', 'check', 'add', 'remove')
        'env'      = @('list', 'get', 'set')
        'sync'     = @('push', 'pull')
    }

    if ($subCommands.ContainsKey($currentCommand)) {
        $subCommands[$currentCommand] | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
    }
}
`;
}
