#!/usr/bin/env python3
"""
手动检查单个产品页面的HTML结构
"""
from playwright.sync_api import sync_playwright
import time

def check_product_page():
    with sync_playwright() as p:
        print("🌐 启动浏览器...")
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        
        # 测试Big Mac页面
        url = "https://www.mcdonalds.com/us/en-us/product/big-mac.html"
        print(f"\n访问: {url}")
        
        page.goto(url, wait_until='domcontentloaded', timeout=90000)
        time.sleep(5)
        
        print("\n=== 查找卡路里 ===")
        # 尝试多种方式查找卡路里
        try:
            # 方法1: 查找所有文本节点
            all_text = page.evaluate('''() => {
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    null
                );
                
                const texts = [];
                let node;
                while (node = walker.nextNode()) {
                    const text = node.textContent.trim();
                    if (text.match(/\\d+\\s*(cal|calories)/i)) {
                        texts.push({
                            text: text,
                            parent: node.parentElement.tagName,
                            class: node.parentElement.className
                        });
                    }
                }
                return texts;
            }''')
            
            print(f"找到 {len(all_text)} 个包含卡路里的文本:")
            for item in all_text[:5]:
                print(f"  - {item['text']} (in <{item['parent']}> class='{item['class']}')")
        except Exception as e:
            print(f"方法1失败: {e}")
        
        print("\n=== 查找营养信息按钮 ===")
        try:
            buttons = page.query_selector_all('button')
            print(f"页面共有 {len(buttons)} 个按钮")
            for i, btn in enumerate(buttons[:10]):
                text = btn.text_content().strip()
                if text:
                    print(f"  {i+1}. {text}")
        except Exception as e:
            print(f"按钮查找失败: {e}")
        
        print("\n=== 点击营养信息按钮 ===")
        try:
            # 查找并点击营养按钮
            nutrition_btn = page.locator('button:has-text("Nutrition")').first
            if nutrition_btn.is_visible():
                print("找到营养按钮,点击...")
                nutrition_btn.click()
                time.sleep(2)
                print("已点击")
            else:
                print("营养按钮不可见")
        except Exception as e:
            print(f"点击失败: {e}")
        
        print("\n=== 查找营养数据 ===")
        try:
            # 获取页面所有包含数字的文本
            nutrition_texts = page.evaluate('''() => {
                const elements = document.querySelectorAll('*');
                const results = [];
                
                for (const el of elements) {
                    const text = el.textContent;
                    // 查找包含"g"或"mg"的文本
                    if (text.match(/\\d+\\s*(g|mg|mcg|%)/)) {
                        // 只获取直接文本节点
                        const directText = Array.from(el.childNodes)
                            .filter(node => node.nodeType === Node.TEXT_NODE)
                            .map(node => node.textContent.trim())
                            .join(' ');
                        
                        if (directText && directText.length < 100) {
                            results.push({
                                tag: el.tagName,
                                class: el.className,
                                text: directText
                            });
                        }
                    }
                }
                return results.slice(0, 30);  // 只返回前30个
            }''')
            
            print(f"找到 {len(nutrition_texts)} 个营养相关文本:")
            for item in nutrition_texts:
                print(f"  - {item['text']} (in <{item['tag']}> class='{item['class']}')")
        except Exception as e:
            print(f"营养数据查找失败: {e}")
        
        print("\n=== 等待30秒供查看 ===")
        time.sleep(30)
        
        browser.close()

if __name__ == '__main__':
    check_product_page()
