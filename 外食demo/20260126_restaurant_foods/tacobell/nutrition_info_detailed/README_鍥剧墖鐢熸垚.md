# Taco Bell 食物图片批量生成工具

## 概述

使用 Vertex AI 的 Nano Banana (gemini-2.5-flash-image) 模型批量生成 Taco Bell 食物的专业图片。

## 功能特点

- ✅ 批量生成食物图片
- ✅ 实时保存生成的图片
- ✅ 进度自动保存（支持中断恢复）
- ✅ 详细日志记录
- ✅ 失败重试机制
- ✅ 正方形白色背景（适合网页展示）

## 文件说明

### 1. `generate_food_images.py` - 测试脚本
- **用途**: 测试生成前 3 个食物的图片
- **适用场景**: 快速测试配置是否正确
- **运行时间**: ~1 分钟

### 2. `generate_all_food_images.py` - 完整版脚本
- **用途**: 批量生成所有食物图片
- **适用场景**: 正式批量生成
- **特点**:
  - 自动保存进度到 `generation_progress.json`
  - 支持中断后继续运行
  - 详细日志保存到 `generation_log.txt`
  - 每 3 秒生成一张图片（避免 API 限流）
- **预计时间**: 约 23 分钟（466 个食物 × 3 秒）

## 使用方法

### 测试运行（推荐先运行）

```bash
cd /Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/tacobell/nutrition_info_detailed
python3 generate_food_images.py
```

### 批量生成所有图片

```bash
cd /Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/tacobell/nutrition_info_detailed
python3 generate_all_food_images.py
```

### 中断后继续

如果脚本中断，直接重新运行即可，会自动跳过已完成的：

```bash
python3 generate_all_food_images.py
```

## 输出文件

### 生成的图片
- **位置**: `generated_pics/`
- **命名格式**: `{序号}_{食物名称}_{时间戳}.png`
- **示例**: `001_Bell Sauce Dipping Sauce_20260130_172357.png`
- **规格**: 
  - 格式: PNG
  - 宽高比: 1:1（正方形）
  - 分辨率: 1024x1024
  - 背景: 白色

### 进度文件
- **文件**: `generated_pics/generation_progress.json`
- **内容**: 记录已完成和失败的食物名称

### 日志文件
- **文件**: `generated_pics/generation_log.txt`
- **内容**: 详细的生成日志（时间戳、状态、错误信息）

## 图片提示词模板

```
Real Food Picture: USA's taco bell's {food_name}
正方形。要能放在网页食谱介绍中的图
只有这一个食物，白色背景。
通用说明：除非食品包装中有文字，否则不要在图片中展示不必要的文字
```

## 技术细节

### API 配置
- **模型**: `gemini-2.5-flash-image` (Nano Banana)
- **项目 ID**: 使用你自己的 GCP 项目 ID（勿将真实 ID 写入公开仓库）
- **区域**: `us-central1`
- **认证**: Service Account (`vertex_ai_credentials.json`)

### 图片配置
```python
config=types.GenerateContentConfig(
    response_modalities=['IMAGE'],  # 只返回图片
    image_config=types.ImageConfig(
        aspect_ratio="1:1",  # 正方形
    )
)
```

### 速率限制
- 每张图片间隔 3 秒
- 避免触发 API 限流

## 依赖安装

```bash
pip install google-genai pandas pillow openpyxl
```

## 测试结果

已成功生成 3 张测试图片：

1. ✅ Bell Sauce Dipping Sauce
2. ✅ Chicken Nuggets - 5 Piece
3. ✅ Chicken Nuggets - 10 Piece

图片质量：专业、清晰、符合网页展示要求

## 常见问题

### Q: 如何查看生成进度？
A: 查看 `generation_log.txt` 文件，或者运行时直接观察控制台输出

### Q: 如何重新生成某些失败的图片？
A: 编辑 `generation_progress.json`，从 `failed` 数组中移除要重新生成的食物名称

### Q: 如何修改图片风格？
A: 编辑脚本中的 `PROMPT_TEMPLATE` 变量

### Q: 生成速度能否加快？
A: 可以减少 `time.sleep()` 的时间，但需注意 API 速率限制

## 后续扩展

- [ ] 支持自定义宽高比
- [ ] 支持批量重试失败项
- [ ] 支持多线程并发生成
- [ ] 支持图片质量检查
- [ ] 支持自动压缩优化

## 更新日志

### 2026-01-30
- ✅ 初始版本
- ✅ 支持批量生成
- ✅ 进度保存功能
- ✅ 测试成功生成 3 张图片
