#!/usr/bin/env python3
"""
更新 El Pollo Loco Excel - 补充 description 和 ingredients
"""

import asyncio
from playwright.async_api import async_playwright
import pandas as pd
import logging
import re

logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def scrape_description_and_ingredients(page, url):
    """爬取单个页面的description和ingredients"""
    try:
        await page.goto(url, wait_until='domcontentloaded', timeout=60000)
        await page.wait_for_timeout(3000)  # 等待内容加载

        # 使用JavaScript直接获取所有p标签
        result = await page.evaluate('''() => {
            const paragraphs = Array.from(document.querySelectorAll('p'))
                .map(p => p.textContent.trim())
                .filter(text => text.length > 50);  // 只要有实质内容的段落

            const h3s = Array.from(document.querySelectorAll('h3'))
                .map(h => h.textContent.trim());

            // 找到FAQ中包含"include"或"comes with"的问题后面的段落
            const allElements = Array.from(document.querySelectorAll('h3, p'));
            let ingredientsText = null;

            for (let i = 0; i < allElements.length - 1; i++) {
                const el = allElements[i];
                if (el.tagName === 'H3') {
                    const h3Text = el.textContent.trim().toLowerCase();
                    if (h3Text.includes('include') || h3Text.includes('comes with') ||
                        h3Text.includes('what is in')) {
                        // 获取下一个p标签
                        const nextP = allElements[i + 1];
                        if (nextP && nextP.tagName === 'P') {
                            ingredientsText = nextP.textContent.trim();
                            break;
                        }
                    }
                }
            }

            return {
                paragraphs: paragraphs.slice(0, 3),  // 前3个主要段落
                h3s: h3s,
                ingredientsFromFAQ: ingredientsText
            };
        }''')

        # 1. 获取description (第一个或第二个段落)
        description = None
        if result['paragraphs'] and len(result['paragraphs']) > 0:
            # 通常第一个非空段落就是主要描述
            description = result['paragraphs'][0]

        # 2. 获取ingredients
        ingredients = result['ingredientsFromFAQ']

        # 如果FAQ中没有，尝试从描述中提取
        if not ingredients and description:
            patterns = [
                r'(?:filled with|comes with|features?|includes?|made with|contains)\s+([^.]+)',
            ]
            for pattern in patterns:
                match = re.search(pattern, description, re.IGNORECASE)
                if match:
                    ingredients = match.group(1).strip()
                    break

        return {
            'description': description,
            'ingredients': ingredients
        }

    except Exception as e:
        logger.error(f"爬取失败 {url}: {e}")
        return {'description': None, 'ingredients': None}

async def update_excel_with_details(excel_path, output_path):
    """更新Excel文件"""
    df = pd.read_excel(excel_path)
    logger.info(f"读取Excel: {len(df)} 条记录")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = await context.new_page()

        updated_count = 0
        for idx, row in df.iterrows():
            url = row['detail_link']
            food_name = row['food_name']

            logger.info(f"[{idx+1}/{len(df)}] {food_name[:50]}")

            data = await scrape_description_and_ingredients(page, url)

            if data['description']:
                df.at[idx, 'description'] = data['description']
                updated_count += 1

            if data['ingredients']:
                df.at[idx, 'ingredients'] = data['ingredients']
                logger.info(f"  ✓ Ingredients: {data['ingredients'][:60]}...")

            await asyncio.sleep(0.3)

        await browser.close()

    # 保存更新后的文件
    df.to_excel(output_path, index=False, engine='openpyxl')

    logger.info(f"\n{'='*60}")
    logger.info(f"✓ 数据已保存: {output_path}")
    logger.info(f"✓ 更新了 {updated_count} 条记录")
    logger.info(f"✓ Description: {len(df[df['description'].notna()])} 条")
    logger.info(f"✓ Ingredients: {len(df[df['ingredients'].notna()])} 条")
    logger.info(f"{'='*60}")

async def main():
    excel_path = "El_Pollo_Loco_Complete.xlsx"
    output_path = "El_Pollo_Loco_Complete_Updated.xlsx"

    logger.info("="*60)
    logger.info("更新 description 和 ingredients")
    logger.info("="*60)

    await update_excel_with_details(excel_path, output_path)

if __name__ == "__main__":
    asyncio.run(main())
