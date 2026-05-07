# 刘益恺 · 个人作品集（dmoes）

过去两年里，我在合作项目中负责或参与搭建、需要统一收口维护的一批**工具与自动化 Demo**、**社媒运营侧的可视化产出**，以及业务上由我**主导或深度参与设计的板块与体系**（尤其是减脂教练相关），都放在这个仓库里做集中展示，方便回顾与对外说明。

本页下面的「从这里开始看」和「本地运行」写给**人**也写给**自动化 Agent**：按顺序执行即可在浏览器里打开作品集前端。

---

## 从这里开始看

| 你想做什么 | 怎么做 |
|------------|--------|
| **只看说明和代码** | 打开仓库：**[https://github.com/liuyika3/-](https://github.com/liuyika3/-)**（README 在首页，下面有目录与文件）。 |
| **不装环境、在浏览器里点作品集** | 若已启用 **GitHub Pages** 且构建成功，可试 **[https://liuyika3.github.io/-/](https://liuyika3.github.io/-/)**；若 404，以本仓库主页为准。 |
| **在自己电脑里交互预览** | 必须走下面「本地运行」四步（**人 / Agent 相同**）。 |

**克隆（公开仓）：** `git clone https://github.com/liuyika3/-.git liuyikai-dmoes`（目录名可自定；**不要**只用 `-` 作文件夹名，以免在终端里和 `cd -` 混淆。）私有仓需作者邀请你的 GitHub 账号。

---

## 本地运行（人 / Agent 按此执行）

目标：启动 **作品集前端** `vibe-portfolio`，在浏览器里左侧选条目、右侧内嵌预览各 Demo。

**前置：** 已安装 **Node.js ≥ 20**（推荐 **22 LTS**）与 **npm**。

在终端中**从仓库根目录**执行（把 `liuyikai-dmoes` 换成你的克隆目录名）：

```bash
cd liuyikai-dmoes/vibe-portfolio
npm install
npm run dev
```

成功后终端会打印本地 URL，一般为 **`http://localhost:5173`**，用浏览器打开即可。

**可选（生产构建本地预览）：**

```bash
cd liuyikai-dmoes/vibe-portfolio
npm ci
npm run build
npm run preview
```

再按终端提示打开（常见为 **`http://localhost:4173`**）。构建说明见 `vibe-portfolio/vite.config.ts`，容器见同目录 `Dockerfile`。

**说明：** 个别子项目（如 Gmail 工具、Vertex 客户端）还需本机服务或自行填写密钥，与上述「作品集壳」无关；未配置时对应条目可能无法完整演示。

---

## 仓库里有什么

| 方向 | 说明 | 位置（示例） |
|------|------|----------------|
| **工具 · 自动化** | 浏览器内工具与自动化原型（部分需本机服务或自行配置密钥） | `gemini_web_client/`、`mail-tool-gmail/` 等 |
| **产品 · Feature** | 功能与流程界面 Demo | `外食demo/`、`onboarding可视化demo/`、`万物教练api demos/` 等 |
| **减脂教练业务** | SPARE 五维总览与各维度界面示意 | **`减脂教练业务展示/`**（见下节） |
| **科普 · 社媒向产出** | 信息流/外跳适用的单页 HTML | `workflow-demos/popular-science-posts/` |
| **方法论长页** | 方法论独立站点构建产物（作品集中单独条目） | 「Jovida Methodology（pre）」 |
| **演讲与需求** | Word、PDF、Markdown 等 | 根目录及子目录中相关文件 |

---

## 减脂教练业务：SPARE 五维

在作品集里进入 **「减脂教练业务展示」**，可见 **SPARE** 总览：**S / P / A / R / E 每个字母可点击**，进入该维度下的 **feature 界面示意**。

| 字母 | 维度 | 含义（一句话） | 点进去看什么 |
|:----:|------|----------------|--------------|
| **S** | 科学性 | 营养信息与识别能力，支撑「吃得明白」 | 食物预识别等（`减脂教练业务展示/modules/m4-pre-recognition.html`） |
| **P** | 个性化 | 结合目标与偏好的解释与建议 | 食物评分与分析（`modules/m3-food-scoring.html`） |
| **A** | 主动性 | 把长期行为拆成可完成的小任务 | 每日挑战与打卡（`modules/m2-daily-challenge.html`） |
| **R** | 结果导向 | 把摄入与消耗讲成可感知的叙事 | **热量燃烧模块**（摄入/消耗与燃烧动效，`modules/m1-food-burn.html`） |
| **E** | 可落地性（外食） | 在外食场景里仍能执行决策 | 外食体系物料（`modules/e-out-eating-system.html`） |

副标题：**科学性 · 个性化 · 主动性 · 结果导向 · 可落地性**。子页内可返回总览。

---

## 技术栈（作品集壳）

**Vite 7、React 19、TypeScript、Tailwind CSS 4。** `npm run build` 会把内嵌预览所需的静态 Demo 打进 `vibe-portfolio/dist/`。

---

## 作者与使用说明

**刘益恺** — 个人作品集与实验归档，内容会随项目更新。转载、商用或二次分发页面与素材前，请先取得作者同意。
