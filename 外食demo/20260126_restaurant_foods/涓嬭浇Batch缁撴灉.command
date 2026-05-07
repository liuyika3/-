#!/bin/bash
# 双击运行：下载 Master Table 批量图片结果，带进度显示
# 需已设置 GEMINI_API_KEY（或在下方临时填写）

cd "$(dirname "$0")"

if [ -z "$GEMINI_API_KEY" ]; then
    echo "未检测到 GEMINI_API_KEY 环境变量。"
    echo "请先设置：export GEMINI_API_KEY=\"你的API密钥\""
    echo "或在终端执行本脚本前运行：source ~/.zshrc  或  source ~/.bash_profile"
    echo ""
    read -p "按回车键退出..."
    exit 1
fi

echo "工作目录: $(pwd)"
echo "开始下载（进度会实时刷新）..."
echo ""

# -u: 无缓冲输出，进度立即显示
python3 -u download_master_batch_with_progress.py

code=$?
echo ""
if [ $code -eq 0 ]; then
    echo "下载与更新已完成。"
else
    echo "脚本退出码: $code"
fi
read -p "按回车键关闭窗口..."
