# Taco Bell 食物图片生成 - Batch API 使用说明

## 📋 项目概述

使用 Google Gemini Batch API 批量生成 Taco Bell 食物图片。

### ✨ Batch API 优势

1. **成本节省 50%** - 相比实时 API 便宜一半
2. **更高速率限制** - 可处理数十万请求
3. **异步处理** - 目标 24 小时内完成（通常更快）
4. **自动缓存** - 内置缓存优化，节省额外成本

## 🔧 技术架构

### API 对比

| 特性 | 实时 API | Batch API |
|------|---------|-----------|
| 成本 | 标准价格 | **50% 折扣** |
| 速率限制 | 较低 | **更高** |
| 响应时间 | 立即 | 目标 24h |
| 适用场景 | 交互式应用 | 大批量生成 |
| 缓存 | 支持 | 自动启用 |

### 工作流程

```
1. 创建 JSONL 输入文件
   ↓
2. 上传到 File API
   ↓
3. 创建 Batch 作业
   ↓
4. 监控作业状态
   ↓
5. 下载结果文件
   ↓
6. 解析并保存图片
```

## 📂 文件说明

### 核心脚本

1. **`generate_batch_images.py`** - 完整的 Batch API 生成流程
   - 创建 JSONL 输入文件
   - 上传并创建作业
   - 监控状态
   - 下载结果

2. **`check_batch_results.py`** - 独立的结果检查脚本
   - 查询作业状态
   - 下载完成的结果
   - 保存图片

### 生成的文件

- `batch_input_requests.jsonl` - Batch API 输入文件
- `batch_generation_log.txt` - 详细日志
- `{序号}_{食物名}_batch_{时间戳}.png` - 生成的图片

## 🚀 使用方法

### 方法 1: 完整流程（推荐）

```bash
cd /Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/tacobell/nutrition_info_detailed
python3 generate_batch_images.py
```

**注意**: 作业创建后会开始监控，可能需要等待几分钟到几小时

### 方法 2: 分步操作

#### Step 1: 生成并提交作业

```bash
python3 generate_batch_images.py
```

记录输出中的作业名称，例如：
```
✓ Batch 作业已创建: batches/klrsu991dls0e1c1en8vqga62y8d8x57qpu5
```

#### Step 2: 稍后检查状态

```bash
python3 check_batch_results.py
```

或使用快速检查命令：
```bash
python3 -c "
import os
from google import genai

BATCH_JOB_NAME = 'batches/YOUR_JOB_NAME'  # 替换为实际作业名
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
batch_job = client.batches.get(name=BATCH_JOB_NAME)
print(f'状态: {batch_job.state.name}')
"
```

## 📝 JSONL 输入格式

```jsonl
{"key":"request-1","request":{"contents":[{"parts":[{"text":"Real Food Picture: USA's taco bell's Bell Sauce Dipping Sauce\n正方形。要能放在网页食谱介绍中的图\n只有这一个食物，白色背景。\n通用说明：不要在图片中生成文字"}]}],"generation_config":{"responseModalities":["IMAGE"]}}}
{"key":"request-2","request":{"contents":[{"parts":[{"text":"Real Food Picture: USA's taco bell's Chicken Nuggets - 5 Piece\n正方形。要能放在网页食谱介绍中的图\n只有这一个食物，白色背景。\n通用说明：不要在图片中生成文字"}]}],"generation_config":{"responseModalities":["IMAGE"]}}}
```

## 🔍 作业状态说明

| 状态 | 含义 | 下一步 |
|-----|------|--------|
| `JOB_STATE_PENDING` | 等待处理 | 继续等待 |
| `JOB_STATE_RUNNING` | 正在处理 | 继续等待 |
| `JOB_STATE_SUCCEEDED` | ✅ 成功 | 下载结果 |
| `JOB_STATE_FAILED` | ❌ 失败 | 查看错误信息 |
| `JOB_STATE_CANCELLED` | 已取消 | 重新提交 |
| `JOB_STATE_EXPIRED` | 超时过期 | 重新提交 |

## 💰 成本估算

### 图片生成成本

- **实时 API**: 每张图片 1290 tokens
- **Batch API**: 相同 tokens，但**价格减半**

### 示例（假设价格）

如果实时 API 每张图片 $0.01:
- 10 张图片（实时）: $0.10
- 10 张图片（Batch）: **$0.05** ✅ 节省 50%
- 466 张图片（Batch）: **$2.33** 而非 $4.66

## 📊 本次测试

### 测试配置

- **模型**: `gemini-2.5-flash-image`
- **食物数量**: 10 个
- **作业名称**: `batches/klrsu991dls0e1c1en8vqga62y8d8x57qpu5`
- **创建时间**: 2026-01-30 12:25:21 UTC
- **状态**: `JOB_STATE_RUNNING` ⏳

### 生成的食物

1. Bell Sauce Dipping Sauce
2. Chicken Nuggets - 5 Piece
3. Chicken Nuggets - 10 Piece
4. Dragonfruit Freeze® (16 oz)
5. Dragonfruit Freeze® (20 oz)
6. Dragonfruit Freeze® with Dragonfruit Syrup (16 oz)
7. Dragonfruit Freeze® with Dragonfruit Syrup (20 oz)
8. Dragonfruit Strawberry Limonada
9. Hidden Valley™ Diablo Ranch Dipping Sauce
10. Jalapeno Honey Mustard Dipping Sauce

## 🛠️ 故障排除

### 常见问题

**Q: 作业一直处于 PENDING 状态？**
A: 正常现象，Batch API 是异步的，通常在几分钟到几小时内完成

**Q: 连接中断怎么办？**
A: 作业已提交，使用 `check_batch_results.py` 检查状态即可

**Q: 如何取消作业？**
```python
client.batches.cancel(name="batches/YOUR_JOB_NAME")
```

**Q: 如何删除作业？**
```python
client.batches.delete(name="batches/YOUR_JOB_NAME")
```

## 📚 参考资料

- [Gemini Batch API 官方文档](https://ai.google.dev/gemini-api/docs/batch-api)
- [图片生成文档](https://ai.google.dev/gemini-api/docs/image-generation)
- [定价信息](https://ai.google.dev/gemini-api/docs/pricing)
- [速率限制](https://ai.google.dev/gemini-api/docs/rate-limits#batch-mode)

## 🎯 下一步计划

- [ ] 监控当前作业完成
- [ ] 下载并验证 10 张测试图片
- [ ] 扩展到所有 466 个食物
- [ ] 优化 prompt 以提高质量
- [ ] 实现失败重试机制

## 📝 更新日志

### 2026-01-30

#### 完成
- ✅ 调研 Batch API 用法
- ✅ 创建完整的 Batch 生成脚本
- ✅ 成功提交 10 个食物的 Batch 作业
- ✅ 实现作业监控和结果下载

#### 进行中
- ⏳ 等待 Batch 作业完成（作业ID: `klrsu991dls0e1c1en8vqga62y8d8x57qpu5`）
- ⏳ 验证生成的图片质量

#### 待办
- ⏸️ 批量生成所有 466 个食物图片

---

**最后更新**: 2026-01-30 20:38 UTC
**作业状态**: RUNNING ⏳
