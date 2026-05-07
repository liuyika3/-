@echo off
chcp 65001 >nul
echo ========================================
echo 添加防火墙规则 - 允许端口 5000
echo ========================================
echo.
echo 需要管理员权限，请右键"以管理员身份运行"
echo.
pause

echo 正在添加防火墙规则...
netsh advfirewall firewall add rule name="Flask Recipe Server" dir=in action=allow protocol=TCP localport=5000

if %errorlevel% == 0 (
    echo.
    echo ✓ 防火墙规则添加成功！
    echo 端口 5000 现在允许入站连接
) else (
    echo.
    echo ✗ 添加失败，请确保以管理员身份运行
)

echo.
pause


