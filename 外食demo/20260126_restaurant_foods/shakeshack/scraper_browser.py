#!/usr/bin/env python3
"""
Shake Shack 菜单爬虫 - 纯网页浏览方式 (Playwright)
爬取 https://shakeshack.com/#/ 的图片(必下载)、描述(desc)、价格
不调用任何 API，仅通过浏览器访问页面解析。
"""

import json
import os
import re
import time
from datetime import datetime
from urllib.parse import urljoin, urlparse

import pandas as pd
import requests
from playwright.sync_api import sync_playwright

BASE_URL = "https://shakeshack.com"
PAGE_URL = "https://shakeshack.com/#/"
IMAGE_DIR = "images"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def download_image(url, save_path):
    """下载图片到本地。若已存在则跳过。"""
    if not url:
        return False
    if os.path.exists(save_path):
        return True
    try:
        if url.startswith("//"):
            url = "https:" + url
        elif not url.startswith("http"):
            url = urljoin(BASE_URL, url)
        # 保留原始 URL 请求（部分 CDN 依赖 query）
        resp = requests.get(url, headers=HEADERS, timeout=30)
        if resp.status_code == 200:
            with open(save_path, "wb") as f:
                f.write(resp.content)
            return True
    except Exception as e:
        print(f"    ⚠️ 下载失败 {url[:60]}...: {e}")
    return False


def safe_filename(s, max_len=80):
    s = re.sub(r"[^\w\s\-\.]", "", s)
    s = re.sub(r"[-\s]+", "_", s).strip("_")
    return (s or "unnamed")[:max_len]


def get_ext(url):
    if not url:
        return ".jpg"
    u = url.lower()
    if ".png" in u:
        return ".png"
    if ".webp" in u:
        return ".webp"
    if ".gif" in u:
        return ".gif"
    return ".jpg"


def load_nutrition_json():
    p = os.path.join(os.path.dirname(__file__), "shakeshack_foods_data.json")
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def merge_nutrition(web_items, nutrition_list):
    by_name = {n.get("food_name", ""): n for n in nutrition_list}
    for w in web_items:
        name = w.get("food_name") or w.get("name") or ""
        if name and name in by_name:
            for k, v in by_name[name].items():
                if k not in w or w[k] is None or w[k] == "":
                    w[k] = v
    return web_items


def attach_images_from_folder(items, image_dir):
    """为尚无 local_image_path 的项，按 food_name 与文件名尽量匹配 images/ 中已下载图"""
    if not os.path.isdir(image_dir):
        return items
    files = [f for f in os.listdir(image_dir) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
    for it in items:
        if it.get("local_image_path") or it.get("image_url"):
            continue
        name = (it.get("food_name") or "").lower()
        key = re.sub(r"^(single|double|triple)\s+", "", name).replace(" ", "").replace("'", "").replace("®", "").replace("™", "")[:40]
        if not key:
            continue
        for f in sorted(files, key=lambda x: -len(x)):
            stem = os.path.splitext(f)[0].lower().replace("_", "").replace(" ", "").replace("-", "")
            if len(stem) < 4:
                continue
            if key in stem or stem in key:
                it["local_image_path"] = os.path.join(image_dir, f)
                break
    return items


def scrape_with_browser():
    """
    用 Playwright 浏览 https://shakeshack.com/#/ ：
    - 收集并下载所有图片
    - 收集描述 (desc)：轮播文案、产品描述等
    - 收集价格：页面上能解析到的 $ 价格
    """
    ensure_dir(IMAGE_DIR)
    all_images = []
    all_items = []
    descs = []
    prices_found = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=HEADERS["User-Agent"],
        )
        page = context.new_page()

        # 1) 打开首页
        print("📡 打开 https://shakeshack.com/#/ ...")
        page.goto(PAGE_URL, wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)

        # 2) 如有 Cookie/第三方跳转弹窗，点 Accept 继续
        try:
            accept = page.locator("a:has-text('Accept'), button:has-text('Accept')").first
            if accept.is_visible():
                accept.click()
                time.sleep(1)
        except Exception:
            pass

        # 3) 收集所有 img：src / srcset，并记录所在区块的文本当 desc
        print("📸 收集页面图片...")
        imgs = page.query_selector_all("img")
        seen_src = set()
        for i, img in enumerate(imgs):
            src = img.get_attribute("src")
            srcset = img.get_attribute("srcset")
            alt = (img.get_attribute("alt") or "").strip()
            # 取最优链接
            url = None
            if src:
                url = src.strip()
            if srcset:
                parts = [p.strip().split()[0] for p in srcset.split(",") if p.strip()]
                if parts:
                    url = parts[-1]
            if not url or url in seen_src:
                continue
            seen_src.add(url)

            # 父级或邻近文本作描述
            parent_desc = ""
            try:
                parent = img.evaluate_handle("el => el.closest('div, article, section, a, figure')")
                if parent:
                    parent_desc = parent.as_element().inner_text() if hasattr(parent, "as_element") else ""
                    parent_desc = (parent_desc or "")[:500]
            except Exception:
                pass

            label = alt or parent_desc.split("\n")[0][:80] if parent_desc else f"img_{i}"
            all_images.append({
                "url": url,
                "alt": alt,
                "parent_text": parent_desc,
                "label": label,
            })

        # 4) 收集轮播/段落中的描述文本
        print("📝 收集描述 (desc)...")
        for sel in ["[class*='slide']", "[class*='carousel']", "[class*='hero']", "article", "section"]:
            try:
                els = page.query_selector_all(sel)
                for el in els:
                    t = el.inner_text().strip()
                    if len(t) > 20 and "Order Now" not in t and "See Terms" not in t:
                        descs.append(t[:800])
            except Exception:
                pass
        # 从 h2 / h3 / p 取短描述
        for sel in ["h2", "h3", "p"]:
            try:
                for el in page.query_selector_all(sel):
                    t = el.inner_text().strip()
                    if 10 < len(t) < 400:
                        descs.append(t)
            except Exception:
                pass

        # 5) 收集价格
        print("💰 收集价格...")
        body_text = page.evaluate("() => document.body.innerText") or ""
        for m in re.finditer(r"\$[\d]+\.?\d*", body_text):
            prices_found.append(m.group(0))

        # 6) 进入 Order 链接获取更多 product 图、描述、价格（可设 DO_ORDER_FLOW=0 跳过）
        if os.environ.get("DO_ORDER_FLOW", "1") != "0":
            print("🔗 进入点餐流程...")
            order_links = page.query_selector_all(
                "a[href*='#/27773'], a[href*='orderSetup'], a:has-text('Order Now')"
            )
            for idx, lnk in enumerate(order_links[:1]):
                try:
                    href = lnk.get_attribute("href")
                    if not href:
                        continue
                    if not href.startswith("http"):
                        href = urljoin(BASE_URL, href)
                    page.goto(href, wait_until="domcontentloaded", timeout=18000)
                    time.sleep(4)
                    for img in page.query_selector_all("img"):
                        src = img.get_attribute("src") or (img.get_attribute("srcset") or "").split()[0]
                        alt = (img.get_attribute("alt") or "").strip()
                        if src and src not in seen_src:
                            seen_src.add(src)
                            all_images.append({"url": src, "alt": alt, "parent_text": "", "label": alt or f"order_{idx}"})
                    bt = page.evaluate("() => document.body.innerText") or ""
                    for m in re.finditer(r"\$[\d]+\.?\d*", bt):
                        if m.group(0) not in prices_found:
                            prices_found.append(m.group(0))
                    for card in page.query_selector_all("[class*='product'], [class*='menu-item'], [data-product]"):
                        try:
                            txt = card.inner_text()
                            img_el = card.query_selector("img")
                            img_url = (img_el.get_attribute("src") or "").strip() if img_el else ""
                            price_m = re.search(r"\$[\d]+\.?\d*", txt)
                            name = (card.query_selector("h3, h4") or card).inner_text().split("\n")[0][:120] if txt else ""
                            if name or img_url or price_m:
                                all_items.append({
                                    "food_name": name[:200], "description": txt[:600],
                                    "price": price_m.group(0) if price_m else "",
                                    "image_url": img_url, "source": "order_flow",
                                })
                        except Exception:
                            pass
                except Exception as e:
                    print(f"   子页异常: {e}")

        browser.close()

    # 7) 下载所有图片到 images/
    print(f"\n📥 下载图片到 {IMAGE_DIR}/ （共 {len(all_images)} 张）...")
    for i, rec in enumerate(all_images):
        url = rec["url"]
        label = safe_filename(rec.get("label") or rec.get("alt") or f"image_{i}")
        ext = get_ext(url)
        fname = f"{label}{ext}" if not label.endswith(ext) else label
        if not fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
            fname = fname + ext
        path = os.path.join(IMAGE_DIR, fname)
        # 避免重名
        base, e = os.path.splitext(fname)
        n = 0
        while os.path.exists(path):
            n += 1
            path = os.path.join(IMAGE_DIR, f"{base}_{n}{e}")
        rec["local_path"] = path
        ok = download_image(url, path)
        rec["downloaded"] = ok
        if ok:
            print(f"   [{i+1}/{len(all_images)}] ✓ {os.path.basename(path)}")
        time.sleep(0.15)

    # 8) 如没有从点餐流解析到商品，则用首页轮播/区块构造“展示项”(带描述与图片)，价格用页面上扫到的
    if not all_items and (all_images or descs):
        common_price = prices_found[0] if prices_found else ""
        for i, rec in enumerate(all_images[:50]):
            all_items.append({
                "food_name": rec.get("alt") or rec.get("label") or f"Item {i+1}",
                "description": rec.get("parent_text") or rec.get("alt") or "",
                "price": common_price,
                "image_url": rec["url"],
                "local_image_path": rec.get("local_path", ""),
                "source": "homepage",
            })
        for d in descs[:30]:
            if d and not any(d[:50] in it.get("description", "") for it in all_items):
                all_items.append({
                    "food_name": d.split("\n")[0][:150],
                    "description": d,
                    "price": prices_found[0] if prices_found else "",
                    "image_url": "",
                    "local_image_path": "",
                    "source": "homepage_text",
                })

    # 9) 把已下载的 local_path 挂到 all_items 里能关联上的项
    for it in all_items:
        img_url = it.get("image_url") or ""
        for rec in all_images:
            if rec.get("url") == img_url and rec.get("downloaded"):
                it["local_image_path"] = rec.get("local_path", "")
                break
        if not it.get("local_image_path") and it.get("image_url"):
            for rec in all_images:
                if (it.get("image_url") in rec.get("url", "")) and rec.get("downloaded"):
                    it["local_image_path"] = rec.get("local_path", "")
                    break

    return {
        "items": all_items,
        "images": all_images,
        "descs": list(dict.fromkeys(descs)),
        "prices": list(dict.fromkeys(prices_found)),
    }


def save_json(data, path="shakeshack_browser_data.json"):
    out = {
        "scraped_at": datetime.now().isoformat(),
        "page_url": PAGE_URL,
        "items": data.get("items", []),
        "images": [
            {"url": r["url"], "alt": r.get("alt"), "local_path": r.get("local_path"), "downloaded": r.get("downloaded")}
            for r in data.get("images", [])
        ],
        "prices_seen": data.get("prices", []),
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"💾 已保存: {path}")


def save_excel(data, path="ShakeShack_Browser_Data.xlsx"):
    items = data.get("items", [])
    if not items:
        # 用 images 建一个简表
        rows = []
        for r in data.get("images", [])[:200]:
            rows.append({
                "image_url": r.get("url"),
                "local_path": r.get("local_path"),
                "alt": r.get("alt"),
                "downloaded": r.get("downloaded"),
            })
        items = rows

    df = pd.DataFrame(items)
    with pd.ExcelWriter(path, engine="openpyxl") as w:
        df.to_excel(w, sheet_name="01_Items", index=False)
        if data.get("images"):
            pd.DataFrame(data["images"]).to_excel(w, sheet_name="02_Images", index=False)
        pd.DataFrame({"price": data.get("prices", [])}).to_excel(w, sheet_name="03_Prices", index=False)
    print(f"💾 已保存: {path}")


def main():
    print("=" * 70)
    print("🍔 Shake Shack 爬虫 - 纯网页浏览 (图片必下载 + desc + 价格)")
    print("=" * 70)

    data = scrape_with_browser()

    # 合并营养数据；并把仅来自 PDF 的菜品也加入，确保全量
    nutrition = load_nutrition_json()
    items = merge_nutrition(data.get("items", []), nutrition)
    names_in = {str(it.get("food_name") or "").strip() for it in items}
    for n in nutrition:
        if (n.get("food_name") or "").strip() not in names_in:
            items.append({**n, "source": "nutrition_only"})
    data["items"] = attach_images_from_folder(items, IMAGE_DIR)

    n_img = sum(1 for r in data["images"] if r.get("downloaded"))
    print(f"\n📊 统计: 图片 {len(data['images'])} 张(已下载 {n_img}), 商品/展示项 {len(data['items'])} 个, "
          f"描述片段 {len(data['descs'])} 条, 价格 {len(data['prices'])} 个")

    save_json(data)
    save_excel(data)

    print("\n✅ 完成。图片在 images/ 目录。")

if __name__ == "__main__":
    main()
