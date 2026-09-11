@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
echo 未找到 Node.js。请先安装 Node.js 后再使用此启动文件。
pause
exit /b 1
)
node serve.cjs --open
pause
