export function generateZshCompletion(): string {
  return `# CLI Manager zsh 自动补全脚本
# 安装方法: 将此文件保存到 ~/.cli-manager/completion/_cli-manager
# 并将 ~/.cli-manager/completion 添加到 fpath:
#   fpath=(\${HOME}/.cli-manager/completion \$fpath)
#   autoload -Uz compinit && compinit

#compdef cli-manager

_cli-manager() {
    local -a commands
    commands=(
        'scan:扫描系统中的 CLI 工具'
        'config:管理配置'
        'list:列出所有已扫描的工具'
        'info:显示工具详细信息'
        'which:定位工具路径'
        'status:显示概览仪表盘'
        'outdated:列出可更新的工具'
        'category:管理工具分类'
        'install:安装工具'
        'uninstall:卸载工具'
        'update:更新工具'
        'version:查看工具版本信息'
        'use:切换工具版本'
        'pin:锁定工具版本'
        'unpin:解除工具版本锁定'
        'rollback:回退工具版本'
        'history:查看版本变更历史'
        'path:管理 PATH 环境变量'
        'env:管理环境变量'
        'doctor:系统健康检查'
        'backup:导出工具清单备份'
        'restore:从备份恢复工具'
        'stats:显示使用统计'
        'report:生成环境报告'
        'sync:多机同步工具清单'
    )

    _arguments -C \\
        '--help[显示帮助]' \\
        '--version[显示版本]' \\
        '--no-color[禁用彩色输出]' \\
        '--format[输出格式]:format:(table json text)' \\
        '1: :->command' \\
        '*::arg:->args'

    case \$state in
        command)
            _describe 'command' commands
            ;;
        args)
            case \${words[2]} in
                config)
                    _values 'action' 'get' 'set' 'list'
                    ;;
                category)
                    _values 'action' 'list' 'set' 'unset'
                    ;;
                path)
                    _values 'action' 'list' 'check' 'add' 'remove'
                    ;;
                env)
                    _values 'action' 'list' 'get' 'set'
                    ;;
                sync)
                    _values 'action' 'push' 'pull'
                    ;;
                install)
                    _values 'source' '--from=npm' '--from=pip' '--from=gh' '--from=scoop' '--from=winget' '--from=choco'
                    ;;
            esac
            ;;
    esac
}

_cli-manager "\$@"
`;
}
