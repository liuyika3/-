# 刘益恺 · 个人作品集（dmoes）

你好，这里是**刘益恺**的作品集仓库：个人开发的**自动化工具**、**产品功能 Demo**、**减脂教练（Jovida）业务与界面**、**社媒向科普物料**，以及部分**演讲与需求文档**，都集中在本仓库中。

---

## 从这里开始看

| 你想做什么 | 怎么做 |
|------------|--------|
| **在网页上看说明和代码** | 打开仓库主页：**[https://github.com/liuyika3/-](https://github.com/liuyika3/-)** — 本页 README 会显示在仓库首页，下方有目录与文件。 |
| **在浏览器里直接点作品集（不装环境）** | 若仓库已开启 **GitHub Pages** 且部署成功，可尝试：**[https://liuyika3.github.io/-/](https://liuyika3.github.io/-/)**。若显示 404，说明静态站尚未发布或最近一次构建失败，以仓库主页为准即可。 |
| **在自己电脑上跑起来** | 见下一节「本地运行」。 |

**克隆仓库（公开仓库时）**：一般不需要仓库作者把你加成协作者；用 HTTPS 即可，例如：

```bash
git clone https://github.com/liuyika3/-.git liuyikai-dmoes
```

若仓库为**私有**，需由作者在 GitHub 上邀请你的账号后，你才能克隆或浏览。

---

## 本地运行（作品集主程序）

主程序在 **`vibe-portfolio/`**：左侧选作品，右侧内嵌预览；也可在界面里用「新标签」全屏打开某一则。

**环境要求：** **Node.js 20 或更高（推荐 22 LTS）**，并自带 **npm**。

```bash
cd liuyikai-dmoes/vibe-portfolio
npm install
npm run dev
```

在终端提示的本地地址（一般为 `http://localhost:5173`）用浏览器打开即可。

若要生产构建或 Docker，见 `vibe-portfolio/` 下的 `vite.config.ts` 与 `Dockerfile`。

---

## 仓库里有什么

| 方向 | 说明 | 位置（示例） |
|------|------|----------------|
| **工具 · 自动化** | 浏览器内工具与自动化原型（部分需本机服务或自行配置密钥） | `gemini_web_client/`、`mail-tool-gmail/` 等 |
| **产品 · Feature** | 功能与流程界面 Demo | `外食demo/`、`onboarding可视化demo/`、`万物教练api demos/` 等 |
| **减脂教练业务** | SPARE 五维总览与各维度下的界面示意 | **`减脂教练业务展示/`**（说明见下节） |
| **科普 · 社媒向产出** | 信息流/外跳适用的单页 HTML | `workflow-demos/popular-science-posts/` |
| **方法论长页** | 方法论独立站点的构建产物（在作品集中为单独条目） | 见作品集内「Jovida Methodology（pre）」 |
| **演讲与需求** | Word、PDF、Markdown 等 | 仓库根目录及子目录中的相关文件 |

部分 Demo 依赖 OAuth、云端 API 或本地服务，**仅供演示**，不等同于线上正式产品；请勿在截图或录屏中泄露密钥。

---

## 减脂教练业务：SPARE 五维

在作品集里进入 **「减脂教练业务展示」** 后，会看到 **SPARE** 总览：**S / P / A / R / E 每个字母都可点击**，进入对应业务维度下的 **feature 界面示意**（静态页或长图）。各字母含义与入口如下（与 `减脂教练业务展示/index.html` 一致）。

| 字母 | 维度 | 含义（一句话） | 点进去看什么 |
|:----:|------|----------------|--------------|
| **S** | 科学性 | 营养信息与识别能力，支撑「吃得明白」 | 食物预识别等界面（`modules/m4-pre-recognition.html`） |
| **P** | 个性化 | 结合目标与偏好的解释与建议 | 食物评分与分析（`modules/m3-food-scoring.html`） |
| **A** | 主动性 | 把长期行为拆成可完成的小任务 | 每日挑战与打卡（`modules/m2-daily-challenge.html`） |
| **R** | 结果导向 | 把摄入与消耗讲成可感知的叙事 | 结果与动效示意（`modules/m1-food-burn.html`） |
| **E** | 可落地性（外食） | 在外食场景里仍能执行决策 | 外食体系界面物料（`modules/e-out-eating-system.html`） |

总览副标题：**科学性 · 个性化 · 主动性 · 结果导向 · 可落地性**。子页内可返回 SPARE 总览。

---

## 技术栈（作品集壳）

**Vite 7、React 19、TypeScript、Tailwind CSS 4。** 开发时通过 Vite 挂载内嵌静态资源；执行 `npm run build` 时会把需在预览里用到的 Demo 文件一并打进 `dist/`，便于静态部署。

---

## 作者与使用说明

**刘益恺** — 个人作品集与实验归档，内容会随项目更新。

转载、商用或二次分发本仓库中的页面与素材前，请先取得作者同意。
