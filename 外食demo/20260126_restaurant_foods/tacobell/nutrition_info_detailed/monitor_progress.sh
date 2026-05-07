#!/bin/bash
# 监控爬取进度

cd /Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/tacobell/nutrition_info_detailed

echo "======================================================================"
echo "Taco Bell 详细信息爬取进度监控"
echo "======================================================================"
echo ""

# 检查进程
if ps aux | grep "scrape_all_details_playwright.py" | grep -v grep > /dev/null; then
    echo "✓ 爬取脚本正在运行"
else
    echo "✗ 爬取脚本未运行"
fi

echo ""

# 显示最新日志
echo "最新日志 (最后20行):"
echo "----------------------------------------------------------------------"
tail -20 logs/*.log 2>/dev/null | tail -20
echo ""

# 显示进度
if [ -f "scraping_progress.json" ]; then
    echo "进度信息:"
    echo "----------------------------------------------------------------------"
    cat scraping_progress.json | python3 -m json.tool | grep -E "(completed|last_index|last_completed)" | head -10
    echo ""
fi

# 显示已完成文件数
completed_count=$(ls -1 detailed_data/*.json 2>/dev/null | wc -l | tr -d ' ')
echo "已完成菜品数: $completed_count / 466"
echo ""

# 显示最近完成的5个菜品
if [ $completed_count -gt 0 ]; then
    echo "最近完成的菜品:"
    ls -lt detailed_data/*.json 2>/dev/null | head -5 | awk '{print "  - " $9}'
fi

echo ""
echo "======================================================================"
echo "按 Ctrl+C 退出监控"
echo "======================================================================"
