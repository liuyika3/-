# What to Eat 功能需求文档

## 概述

What to Eat 是 Jovida 的核心功能页面，帮助用户在饭点时快速决策吃什么。该功能通过 AI 推荐、筛选工具、卡片式展示等方式，提供个性化的饮食建议。与首页对话式交互不同，What to Eat 页面以**卡片式推荐**为核心交互方式，用户可以通过快捷筛选、文本输入等方式获取推荐，并查看详细信息后确认选择。

---

## 问题回顾

- 用户在饭点时不知道吃什么，需要快速决策
- 首页对话式交互无法快速展示多个选项供用户对比
- 用户需要根据时间、人数、口味、预算等条件筛选
- 用户需要查看详细的营养信息和推荐理由
- Challenge 任务中涉及饮食相关时，需要直接跳转到 What to Eat 页面

---

## 功能范围

**本 Cycle 重点：What to Eat 功能**

- ✅ What to Eat 主页面（二级页）
- ✅ What to Eat 详情页（三级页）
- ✅ Challenge 中的"不知道怎么做？和 Jovida 聊聊"按钮逻辑
- ✅ 饭点主动触达逻辑
- ✅ 卡片式推荐展示
- ✅ 筛选和搜索交互

**后续 Cycle：**
- ⏸️ 备餐功能（Meal Prep）
- ⏸️ 零食推荐（Snack）
- ⏸️ 知识学习（Knowledge）

---

## 页面结构

### 页面层级关系

```
首页（Home）
  ├── What to Eat（二级页）
  │     └── 详情页（三级页）
  │
  └── Challenge 卡片
        └── "不知道怎么做？和 Jovida 聊聊"按钮
              └── 跳转到 What to Eat（二级页）
```

---

## 页面详细设计

### 1. 首页（Home）

#### 1.1 Challenge 卡片中的"不知道怎么做？和 Jovida 聊聊"按钮

| 字段 | 说明 |
| --- | --- |
| **位置** | Challenge 卡片底部，所有 Challenge 都有此按钮 |
| **样式** | 灰色背景，文字："不知道怎么做？和 Jovida 聊聊"，带消息图标 |
| **交互逻辑** | 点击后根据 Challenge 类型决定跳转行为 |

**跳转逻辑：**

| Challenge 类型 | 跳转行为 | 显示消息 |
| --- | --- | --- |
| 饮食相关 Challenge（如"多吃一份蔬菜"、"和 Jovida 一起决策晚饭吃什么"） | 直接跳转到 What to Eat 页面 | 显示与 Challenge 主题相关的消息（如"绿色蔬菜推荐 🥬"） |
| 非饮食相关 Challenge（如"早睡"、"步行"、"饮水"） | 在首页显示对话消息 | 显示相关建议和技巧 |

**技术实现：**
- 按钮 `data-challenge-chat` 属性绑定 Challenge ID
- `handleChallengeChat(challenge)` 函数处理跳转逻辑
- 跳转时传递 `source` 参数（'vegetables', 'b12' 等）用于显示对应消息

#### 1.2 饭点主动触达

| 字段 | 说明 |
| --- | --- |
| **触发时机** | 系统检测到饭点时间（早/中/晚餐） |
| **展示方式** | 首页底部显示"饭点到了"按钮（或气泡提示） |
| **交互逻辑** | 点击后直接跳转到 What to Eat 页面 |

**技术实现：**
- `handleMealTime()` 函数处理跳转
- 跳转时传递 `source: 'meal_time'` 参数
- 显示消息："饭点到了！🍽️ 我为你准备了一些适合当前时间的饮食方案..."

---

### 2. What to Eat 页面（二级页）

#### 2.1 页面布局

```
┌─────────────────────────┐
│  ← 返回按钮              │
│                         │
│  小兔子动画（挥手）       │
│  What to Eat 标题       │
│                         │
│  ┌─────────────────┐   │
│  │ 推荐卡片 1       │   │
│  └─────────────────┘   │
│  ┌─────────────────┐   │
│  │ 推荐卡片 2       │   │
│  └─────────────────┘   │
│  ...                    │
│                         │
│  ┌─────────────────┐   │
│  │ 快捷筛选按钮区   │   │
│  │ 输入框 + 发送    │   │
│  └─────────────────┘   │
└─────────────────────────┘
```

#### 2.2 页面状态

| 状态 | 说明 | 显示内容 |
| --- | --- | --- |
| `initial` | 初始状态 | 显示默认推荐卡片（2-3个） |
| `restaurant_selected` | 用户点击"我选好餐厅了" | 清空推荐卡片，显示上传图片按钮 |
| `results_shown` | 搜索/筛选后 | 显示新的推荐卡片 |

#### 2.3 默认推荐逻辑

**进入页面时的默认推荐：**

| 跳转来源 | 显示消息 | 推荐内容 |
| --- | --- | --- |
| 饭点按钮 | "饭点到了！🍽️ 我为你准备了一些适合当前时间的饮食方案..." | 根据当前时间推荐（早餐/午餐/晚餐） |
| 蔬菜 Challenge | "绿色蔬菜推荐 🥬 基于你要多吃绿色蔬菜的目标..." | 富含蔬菜的菜品推荐 |
| B12 Challenge | "维生素 B12 晚餐推荐 🥩 维生素 B12 很难从日常饮食中获取..." | 富含 B12 的菜品推荐（牛肉、鱼类、蛋类） |
| 其他入口 | "What to Eat? 👋 结合你今天的运动量..." | 通用推荐（轻食沙拉、高蛋白意面等） |

**推荐卡片数据结构：**

```typescript
interface RecommendationCard {
  id: number;                    // 唯一标识
  name: string;                  // 餐厅/地点名称（如"Sweetgreen"、"自家厨房"）
  dish: string;                   // 菜品名称（如"Harvest Bowl"、"西红柿牛腩意面"）
  scene: 'out' | 'home';         // 场景：外出就餐 / 在家做
  type: string;                   // 类型标签（如"健康沙拉"、"家常食谱"）
  calories: string;               // 热量（如"450"）
  matchScore: number;             // AI 匹配度（0-100）
  tags: string[];                 // 标签数组（如["高纤维", "低GI"]）
  imageColor: string;             // 背景色类名（如"bg-emerald-100"）
  aiReason: string;               // AI 推荐理由
}
```

#### 2.4 快捷筛选功能

**筛选按钮区域：**

| 按钮 | 图标 | 筛选类型 | 选项 |
| --- | --- | --- | --- |
| 我选好餐厅了 | 🏪 | 特殊功能 | 点击后进入上传菜单模式 |
| 时间 | ⏰ | time | ['10 min', '20 min'] |
| 人数 | 👥 | people | ['1人食', '2人约会'] |
| 口味 | 🎚️ | taste | ['清淡', '重口', '辣'] |
| 预算 | 💰 | budget | ['50元以内', '不差钱'] |

**筛选交互流程：**

1. 用户点击筛选按钮（如"时间"）
2. 底部弹出筛选选项面板（显示对应选项）
3. 用户选择选项（如"10 min"）
4. 选项自动填入输入框，面板关闭
5. 用户可继续选择其他筛选条件或直接回车搜索
6. 回车后调用搜索接口，返回新的推荐卡片

**技术实现：**
- `activeFilter` 状态控制当前打开的筛选面板
- `filterOptions.decision` 存储所有筛选选项
- `handleOptionSelect(type, option)` 处理选项选择
- 选项选择后更新 `searchQuery`，不立即搜索

#### 2.5 文本输入和搜索

**输入框功能：**

| 功能 | 说明 |
| --- | --- |
| **位置** | 页面底部，筛选按钮下方 |
| **占位符** | "输入需求..." |
| **交互** | 支持文本输入 + 回车搜索 |
| **发送按钮** | 右侧发送图标按钮 |

**搜索逻辑：**

1. 用户输入文本或选择筛选条件
2. 回车或点击发送按钮
3. 调用 `handleSearchSubmit()` 函数
4. 根据当前状态执行不同逻辑：
   - 如果 `interactionStep === 'restaurant_selected'`：上传图片，显示点餐套路 Combo
   - 否则：调用搜索接口，返回推荐卡片

**搜索后的展示：**

- **文字回复**：显示 AI 消息（如"为你找到了这个最佳选项！"）
- **卡片回复**：显示新的推荐卡片（这是与首页的本质区别）
- 卡片包含搜索结果，匹配度可能更高

**点餐套路 Combo（特殊场景）：**

当用户点击"我选好餐厅了"并上传菜单后，显示点餐套路组合：

```typescript
interface ComboItem {
  id: number;
  name: string;                  // 如"点餐套路 Combo 1"
  dish: string;                   // 如"主菜 + 配菜 + 汤品"
  type: '点餐套路';
  calories: string;
  matchScore: number;
  tags: string[];                 // 如["营养均衡", "经典搭配"]
  imageColor: string;
  aiReason: string;               // 推荐理由
}
```

#### 2.6 推荐卡片展示

**卡片样式：**

```
┌─────────────────────────────┐
│ [推荐单品]             右上角 │
│                             │
│  🍽️ 图标                    │
│  菜品名称                    │
│  餐厅/地点名称               │
│                             │
│  🔥 450 kcal    AI 98%      │
│                             │
│  "AI 推荐理由..."            │
└─────────────────────────────┘
```

**卡片字段：**

| 字段 | 位置 | 样式 |
| --- | --- | --- |
| 类型标签 | 右上角 | 橙色背景，白色文字（如"推荐单品"） |
| 图标 | 左侧 | 餐具图标，背景色根据 `imageColor` |
| 菜品名称 | 主标题 | 粗体，较大字号 |
| 餐厅/地点 | 副标题 | 小字号，灰色 |
| 热量 | 底部左侧 | 火焰图标 + 数字 + "kcal" |
| AI 匹配度 | 底部右侧 | "AI 98%" 标签 |
| 推荐理由 | 底部 | 灰色文字，引号包裹 |

**卡片交互：**

- 点击卡片 → 跳转到详情页（三级页）
- 卡片支持滑动查看（如果数量较多）

---

### 3. 详情页（三级页）

#### 3.1 页面布局

```
┌─────────────────────────┐
│  ← 返回按钮              │
│                         │
│  [背景色区域]            │
│  背景图标（半透明）      │
│  小兔子动画              │
│                         │
│  菜品名称    AI 98%      │
│  餐厅/地点名称           │
│                         │
│  [标签] [标签] [标签]     │
│                         │
│  ┌─────────────────┐   │
│  │ 内容描述区       │   │
│  └─────────────────┘   │
│                         │
│  ┌─────────────────┐   │
│  │ Energy: 450 kcal│   │
│  │ P  C  F  ...    │   │
│  └─────────────────┘   │
│                         │
│  ┌─────────────────┐   │
│  │ Jovida Insight  │   │
│  │ "推荐理由..."    │   │
│  └─────────────────┘   │
│                         │
│  [就它了 按钮]           │
└─────────────────────────┘
```

#### 3.2 详情页字段

| 字段 | 说明 | 数据来源 |
| --- | --- | --- |
| **背景区域** | 顶部背景色区域，高度 256px | `item.imageColor` |
| **背景图标** | 半透明餐具图标 | 根据父页面类型显示 |
| **小兔子动画** | 右下角，挥手动画 | `rabbitAnimation: 'waving'` |
| **菜品名称** | 主标题，大字号 | `item.dish` |
| **AI 匹配度** | 右上角标签 | `item.matchScore` |
| **餐厅/地点** | 副标题，小字号灰色 | `item.name` |
| **标签** | 多个标签展示 | `item.tags[]` |
| **内容描述** | 菜品描述或内容 | `item.content` 或 `item.desc` |
| **热量** | Energy 区域，大字号 | `item.calories` |
| **营养素** | 蛋白质、碳水、脂肪等 | `estimateNutrients(item)` 计算得出 |
| **Jovida Insight** | AI 推荐理由 | `item.aiReason` |

**营养素计算逻辑：**

```typescript
function estimateNutrients(item) {
  const calories = parseInt(item.calories) || 0;
  if (calories === 0) return null;
  
  return {
    protein: Math.round(calories * 0.08) + 'g',    // 8%
    carbs: Math.round(calories * 0.1) + 'g',       // 10%
    fat: Math.round(calories * 0.04) + 'g',        // 4%
    fiber: Math.round(calories * 0.02) + 'g',      // 2%
    sugar: Math.round(calories * 0.01) + 'g',      // 1%
    sodium: Math.round(calories * 1.5) + 'mg'      // 1.5倍
  };
}
```

#### 3.3 "就它了"按钮

| 字段 | 说明 |
| --- | --- |
| **位置** | 页面底部固定位置 |
| **样式** | 黑色背景，白色文字，大字号，带对勾图标 |
| **交互逻辑** | 点击后执行确认选择流程 |

**确认选择流程：**

1. 显示庆祝动画（奖章 + 彩纸效果，持续 2 秒）
2. 清除当前页面的悬浮窗（如果存在）
3. 重置搜索和筛选状态
4. 返回首页
5. 显示新对话消息："告诉我你的感受 💭 告诉我你吃完的感受，健康上满足了，我更关心你是不是喜欢我给你找的餐厅/食物的口味"

**技术实现：**
- `confirmChoice()` 函数处理确认逻辑
- `showCelebration` 状态控制庆祝动画
- 返回首页后，`activePortals` 移除当前页面

---

## 交互流程

### 流程 1：从饭点按钮进入

```
首页
  ↓ 点击"饭点到了"按钮
What to Eat 页面（显示饭点相关消息 + 默认推荐）
  ↓ 点击推荐卡片
详情页
  ↓ 点击"就它了"
首页（显示新对话）
```

### 流程 2：从 Challenge 进入

```
首页 Challenge 卡片
  ↓ 点击"不知道怎么做？和 Jovida 聊聊"
What to Eat 页面（显示 Challenge 主题相关消息 + 相关推荐）
  ↓ 点击推荐卡片
详情页
  ↓ 点击"就它了"
首页（显示新对话）
  ↓ 点击 Challenge 的"I did it"或"拍照上传证明"
完成 Challenge（显示庆祝动画）
```

### 流程 3：搜索和筛选

```
What to Eat 页面
  ↓ 点击筛选按钮（如"时间"）
筛选选项面板弹出
  ↓ 选择选项（如"10 min"）
选项填入输入框，面板关闭
  ↓ 继续选择其他筛选或直接回车
搜索执行
  ↓ 显示新的推荐卡片 + AI 消息
点击卡片查看详情
```

### 流程 4：餐厅点餐场景

```
What to Eat 页面
  ↓ 点击"我选好餐厅了"
进入上传菜单模式（清空推荐卡片）
  ↓ 点击上传图片按钮（或输入餐厅名称）
上传图片/输入餐厅名称
  ↓ 等待 AI 分析
显示点餐套路 Combo 卡片（3个组合）
  ↓ 点击 Combo 卡片
详情页
  ↓ 点击"就它了"
首页
```

---

## Challenge 完成逻辑

### I did it 按钮（check 类型）

| Challenge 类型 | 按钮位置 | 交互流程 |
| --- | --- | --- |
| check 类型 | Challenge 卡片底部主按钮 | 点击 → 显示庆祝动画 → 标记完成 → 从列表中移除 |

**完成逻辑：**
1. 点击"I did it"按钮
2. 显示庆祝动画（2秒）
3. 添加完成消息到聊天记录
4. 将 Challenge ID 添加到 `completedChallengeIds`
5. 调整 `activeChallengeIndex`，确保显示正确的 Challenge
6. 2秒后移除 Challenge，显示下一个

### 拍照上传证明（photo 类型）

| Challenge 类型 | 按钮位置 | 交互流程 |
| --- | --- | --- |
| photo 类型 | Challenge 卡片底部主按钮 | 点击 → 打开相机/相册 → 上传图片 → 显示庆祝动画 → 标记完成 |

**完成逻辑：**
1. 点击"拍照上传证明"按钮
2. 打开相机/相册选择图片
3. 上传图片（显示上传进度）
4. 验证图片（可选：AI 识别是否符合 Challenge 要求）
5. 显示庆祝动画（2秒）
6. 标记 Challenge 完成
7. 从列表中移除

---

## 技术实现要点

### 1. 状态管理

```typescript
// 核心状态
currentView: 'home' | 'decision' | 'detail'        // 当前视图
activePortals: string[]                              // 活跃的悬浮窗列表
navigationSource: 'meal_time' | 'vegetables' | 'b12' | null  // 跳转来源

// What to Eat 页面状态
interactionStep: 'initial' | 'restaurant_selected' | 'results_shown'  // 交互步骤
searchQuery: string                                   // 搜索查询
activeFilter: string | null                           // 当前打开的筛选面板
displayItems: RecommendationCard[]                    // 显示的推荐卡片列表

// Challenge 相关状态
currentChallengeContext: 'b12' | 'vegetables' | null  // Challenge 上下文
completedChallengeIds: number[]                       // 已完成的 Challenge ID 列表
activeChallengeIndex: number                          // 当前显示的 Challenge 索引
```

### 2. 关键函数

| 函数名 | 功能 | 参数 |
| --- | --- | --- |
| `handleNavigate(view, skipInitialMessage, source)` | 页面跳转 | view: 目标页面, skipInitialMessage: 是否跳过默认消息, source: 跳转来源 |
| `handleMealTime()` | 处理饭点按钮点击 | 无 |
| `handleChallengeChat(challenge)` | 处理 Challenge 聊天按钮 | challenge: Challenge 对象 |
| `handleSearchSubmit()` | 处理搜索提交 | 无 |
| `handleOptionSelect(type, option)` | 处理筛选选项选择 | type: 筛选类型, option: 选项值 |
| `handleRestaurantSelected()` | 处理"我选好餐厅了" | 无 |
| `openDetail(item)` | 打开详情页 | item: 推荐卡片数据 |
| `confirmChoice()` | 确认选择 | 无 |
| `handleChallengeComplete(challenge)` | 完成 Challenge | challenge: Challenge 对象 |

### 3. 数据接口（需要后端支持）

| 接口 | 功能 | 请求参数 | 返回数据 |
| --- | --- | --- | --- |
| `/api/recommendations/default` | 获取默认推荐 | `source?: string` | `RecommendationCard[]` |
| `/api/recommendations/search` | 搜索推荐 | `query: string, filters?: object` | `RecommendationCard[]` |
| `/api/restaurant/analyze-menu` | 分析菜单图片 | `image: File, restaurant?: string` | `ComboItem[]` |
| `/api/challenge/complete` | 完成 Challenge | `challengeId: number, proof?: File` | `{ success: boolean, reward: number }` |

### 4. 动画和交互

| 动画 | 触发时机 | 持续时间 |
| --- | --- | --- |
| 小兔子挥手 | 进入 What to Eat 页面时 | 2秒后自动停止 |
| 卡片滑入 | 显示推荐卡片时 | 0.4秒 |
| 筛选面板弹出 | 点击筛选按钮时 | 0.4秒 |
| 庆祝动画 | 确认选择或完成 Challenge 时 | 2秒 |
| 页面切换 | 跳转页面时 | 0.3秒 |

---

## 研发 Checklist

### 前端开发

- [ ] 实现 What to Eat 页面布局（二级页）
- [ ] 实现详情页布局（三级页）
- [ ] 实现推荐卡片组件
- [ ] 实现筛选按钮和选项面板
- [ ] 实现搜索输入框和发送逻辑
- [ ] 实现"我选好餐厅了"和上传图片功能
- [ ] 实现"就它了"按钮和确认流程
- [ ] 实现 Challenge 卡片中的"不知道怎么做？和 Jovida 聊聊"按钮
- [ ] 实现饭点按钮和跳转逻辑
- [ ] 实现页面跳转和状态管理
- [ ] 实现动画效果（小兔子、卡片、庆祝等）
- [ ] 实现营养素计算逻辑

### 后端开发

- [ ] 实现默认推荐接口（支持 source 参数）
- [ ] 实现搜索推荐接口（支持 query 和 filters）
- [ ] 实现菜单图片分析接口（OCR + AI 推荐）
- [ ] 实现 Challenge 完成接口
- [ ] 实现图片上传和存储

### 联调和测试

- [ ] 测试从饭点按钮跳转到 What to Eat 页面
- [ ] 测试从 Challenge 跳转到 What to Eat 页面
- [ ] 测试筛选和搜索功能
- [ ] 测试上传菜单和点餐套路推荐
- [ ] 测试详情页展示和"就它了"按钮
- [ ] 测试 Challenge 完成流程（I did it 和拍照上传）
- [ ] 测试页面返回和状态保持
- [ ] 测试不同跳转来源的消息显示

---

## 注意事项

1. **消息显示逻辑**：无论从哪个入口进入 What to Eat 页面，都必须显示与跳转来源相关的消息，不能跳过。

2. **卡片式回复**：What to Eat 页面的核心区别是**卡片式推荐**，搜索后必须返回卡片列表，不能只有文字回复。

3. **状态管理**：页面跳转时需要正确管理状态，特别是 `navigationSource` 和 `currentChallengeContext`，确保消息显示正确。

4. **返回逻辑**：从详情页点击"就它了"后，必须返回首页，不能返回 What to Eat 页面。

5. **Challenge 完成**：完成 Challenge 后需要正确更新 `completedChallengeIds` 和 `activeChallengeIndex`，确保 UI 正确显示。

6. **筛选逻辑**：筛选选项选择后不立即搜索，而是填入输入框，用户可以继续选择其他条件或直接回车搜索。

7. **上传图片**：上传菜单图片时需要显示上传进度，上传完成后显示点餐套路 Combo 卡片。

---

## 附录：数据结构示例

### RecommendationCard 示例

```json
{
  "id": 1,
  "name": "Sweetgreen",
  "dish": "Harvest Bowl",
  "scene": "out",
  "type": "健康沙拉",
  "calories": "450",
  "matchScore": 98,
  "tags": ["高纤维", "低GI"],
  "imageColor": "bg-emerald-100",
  "aiReason": "由于你今天久坐较久，这款能量碗能帮助肠道蠕动。"
}
```

### ComboItem 示例

```json
{
  "id": 201,
  "name": "点餐套路 Combo 1",
  "dish": "主菜 + 配菜 + 汤品",
  "scene": "out",
  "type": "点餐套路",
  "calories": "650",
  "matchScore": 95,
  "tags": ["营养均衡", "经典搭配"],
  "imageColor": "bg-blue-50",
  "aiReason": "根据你上传的菜单，这个组合既满足营养需求，又不会超标。主菜选蛋白质，配菜选蔬菜，汤品选清淡的。"
}
```

---

**文档版本：** v1.0  
**最后更新：** 2024-12-19  
**负责人：** 产品团队


