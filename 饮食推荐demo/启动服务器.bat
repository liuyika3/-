@echo off
chcp 65001 >nul
echo ========================================
echo Jovida 食谱推荐引擎
echo ========================================
echo.
echo 正在启动服务器...
echo.
echo 服务器启动后，控制台会显示：
echo - 本地访问地址
echo - 局域网访问地址
echo.
echo 请查看控制台输出的完整访问信息
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.
python start_server.py
pause

