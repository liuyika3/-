"""One-off: generate labeled PNG placeholders. Replace files with real screenshots when ready."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent


def load_font(size: int):
    for p in (
        r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\msyhbd.ttc",
        r"C:\Windows\Fonts\seguiemj.ttf",
    ):
        try:
            return ImageFont.truetype(p, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def phone_frame(draw: ImageDraw.ImageDraw, w: int, h: int, title: str, lines: list[str], bg: tuple[int, int, int]):
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=36, fill=bg, outline=(60, 70, 90), width=2)
    draw.rounded_rectangle((18, 52, w - 18, 120), radius=14, fill=(15, 23, 42))
    font_t = load_font(22)
    font_b = load_font(18)
    draw.text((28, 68), title, fill=(226, 232, 240), font=font_t)
    y = 150
    for line in lines:
        draw.text((28, y), line, fill=(148, 163, 184), font=font_b)
        y += 34


def save_phone(name: str, title: str, lines: list[str], bg: tuple[int, int, int]):
    w, h = 390, 844
    im = Image.new("RGB", (w, h), (11, 15, 20))
    d = ImageDraw.Draw(im)
    phone_frame(d, w, h, title, lines, bg)
    im.save(OUT / name, format="PNG", optimize=True)


def save_wide_logic(name: str):
    w, h = 1200, 620
    im = Image.new("RGB", (w, h), (15, 23, 42))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((16, 16, w - 17, h - 17), radius=20, fill=(17, 24, 39), outline=(52, 211, 153), width=2)
    font = load_font(24)
    d.text((40, 40), "外食推荐 · Agent × 工程筛选（逻辑图例占位）", fill=(226, 232, 240), font=font)
    font_s = load_font(18)
    steps = [
        "main_agent → 标签 / L0–L4 筛选 → 数量阈值 → final_recommend_agent",
        "浅蓝：Agent 输出  ·  紫圈：工程硬筛  ·  替换为正式逻辑图时请保持文件名 waishe-pipeline-logic.png",
    ]
    y = 100
    for t in steps:
        d.text((40, y), t, fill=(148, 163, 184), font=font_s)
        y += 40
    im.save(OUT / name, format="PNG", optimize=True)


def main():
    save_phone(
        "m4-ui-scan.png",
        "① 扫描 / 分类（占位）",
        ["相机取景 + Non-food 判定", "请替换为真实截图 m4-ui-scan.png"],
        (30, 58, 95),
    )
    save_phone(
        "m4-ui-result.png",
        "② 识别结果卡（占位）",
        ["营养浮层 · 1/5 · Scan More / Log All", "请替换为真实截图 m4-ui-result.png"],
        (30, 70, 80),
    )
    save_phone(
        "m4-ui-limit.png",
        "③ 批量与上限（占位）",
        ["Limit Reached · 一键落库", "请替换为真实截图 m4-ui-limit.png"],
        (55, 48, 75),
    )
    save_phone(
        "m2-daily-challenge-ui.png",
        "每日挑战（占位）",
        ["连续打卡 · 挑战卡 · Take Photos", "请替换为 assets/m2-daily-challenge-ui.png"],
        (75, 55, 30),
    )
    save_phone(
        "waishe-home.png",
        "外食 · 首页推荐（占位）",
        ["Next Meal Ideas 横滑卡片", "请替换为你提供的外食首页切图"],
        (22, 78, 58),
    )
    save_phone(
        "waishe-detail-out.png",
        "外食 · 套餐详情（占位）",
        ["门店 / 宏量 / Maps", "请替换为你提供的外食详情切图"],
        (22, 70, 65),
    )
    save_phone(
        "waishe-detail-recipe.png",
        "外食 · 菜谱备餐（占位）",
        ["食材 · 步骤 · 第三方下单", "请替换为你提供的菜谱详情切图"],
        (28, 62, 72),
    )
    save_wide_logic("waishe-pipeline-logic.png")
    print("wrote placeholders to", OUT)


if __name__ == "__main__":
    main()
