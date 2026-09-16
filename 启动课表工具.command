#!/bin/zsh -l
# Finder 双击时也从项目目录启动，支持包含空格的路径。
cd -- "${0:A:h}" || exit 1

if ! command -v node >/dev/null 2>&1; then
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
fi
if ! command -v node >/dev/null 2>&1; then
  print "未找到 Node.js。请先从 https://nodejs.org 安装 Node.js LTS，再双击此文件。"
  read -r "?按回车关闭窗口…"
  exit 1
fi

node serve.cjs --open
launcher_result=$?
if (( launcher_result != 0 )); then
  print "启动失败，请查看上方提示。若工具已运行，直接打开 http://127.0.0.1:4173/。"
  read -r "?按回车关闭窗口…"
fi
exit $launcher_result
