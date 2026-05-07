# Master Table 缺图批量生成说明

使用 Gemini 2.5 Flash Image Batch API 为 `Restaurant_Foods_Master_Table.xlsx` 中 `local_image_path` 为空的记录生成图片，并回写路径。

## 前置条件

- 环境变量: `export GEMINI_API_KEY="your-key"`
- Prompt 模板: `generate_food_pic_prompt.md`（占位符 `{{restaurant_name}}`、`{{food_name}}`）

## 步骤一：提交 Batch 作业

```bash
cd business/20260126_restaurant_foods
python3 batch_generate_master_images.py
```

- 会筛选表中 `local_image_path` 为空的 474 条记录
- 按每批 100 条拆成 5 个 Batch 作业并提交
- 作业信息写入 `batch_jobs_master.json`

## 步骤二：下载结果并更新 Excel

**方式 A：先等 5–10 分钟，再只做下载**

```bash
python3 download_master_batch_results.py
```

**方式 B：一直等到所有作业完成后再下载（推荐）**

```bash
python3 download_master_batch_results.py --wait
```

- 会轮询所有作业状态（每 60 秒一次），全部完成后自动下载
- 图片保存到 `generated_images/`，文件名形如 `0001_Taco_Bell_xxx.png`
- 会更新 `Restaurant_Foods_Master_Table.xlsx` 中对应行的 `local_image_path`（相对路径，如 `generated_images/0001_xxx.png`）

## 文件说明

| 文件 | 说明 |
|------|------|
| `batch_generate_master_images.py` | 创建 JSONL、提交 5 个 Batch 作业 |
| `download_master_batch_results.py` | 下载结果、保存图片、回写 Excel |
| `batch_jobs_master.json` | 作业 ID 与批次信息（由步骤一生成） |
| `batch_input_master_*.jsonl` | 各批次输入（步骤一生成） |
| `generated_images/` | 生成的图片输出目录 |

## 注意事项

- 部分请求可能无图片返回（内容策略等），对应行不会写入路径，可后续用实时 API 补跑
- Excel 中已有 `local_image_path` 的行不会被覆盖
