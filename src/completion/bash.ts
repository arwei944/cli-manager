export function generateBashCompletion(): string {
  return `# CLI Manager bash 自动补全脚本
# 安装方法: 将此文件保存到 ~/.cli-manager/completion/cli-manager.bash
# 并在 ~/.bashrc 中添加: source ~/.cli-manager/completion/cli-manager.bash

_cli_manager_completions() {
    local cur prev opts
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    local commands="scan config list info which status outdated category install uninstall update version use pin unpin rollback history path env doctor backup restore stats report sync help"
    local global_opts="--help --version --no-color --format"

    # 子命令映射
    local subcmds=""
    case "\${COMP_WORDS[1]}" in
        config)   subcmds="get set list" ;;
        category) subcmds="list set unset" ;;
        path)     subcmds="list check add remove" ;;
        env)      subcmds="list get set" ;;
        sync)     subcmds="push pull" ;;
    esac

    if [ $COMP_CWORD -eq 1 ]; then
        COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
    elif [ $COMP_CWORD -eq 2 ] && [ -n "$subcmds" ]; then
        COMPREPLY=( $(compgen -W "$subcmds" -- "$cur") )
    else
        COMPREPLY=( $(compgen -W "$global_opts" -- "$cur") )
    fi

    return 0
}

complete -F _cli_manager_completions cli-manager
`;
}
