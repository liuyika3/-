# 刘益恺 · 个人作品集（dmoes）

本仓库是**刘益恺**的个人作品与实验集合：把日常开发里的**自动化工具**、**产品功能 Demo**、**减脂教练（Jovida）业务与界面**、**社媒向科普物料**，以及部分**演讲与需求文档**放在同一处，便于自己回顾，也方便对外展示时一键打开。

---

## 给 HR / 面试官：要不要克隆、用谁的 GitHub

- **只想看作品集界面**：**不必**克隆、也**不必**登录你的 GitHub。让对方直接打开 **[https://liuyika3.github.io/-/](https://liuyika3.github.io/-/)** 即可（与仓库是否公开无关；若打不开，多半是 Pages 未开或 Actions 未跑完，见下文「在线作品集」一节）。
- **仓库是「公开 Public」时**：对方可以用**自己的任意 GitHub 账号**或**不登录**，用 HTTPS 克隆，例如：  
  `git clone https://github.com/liuyika3/-.git`  
  克隆与拉代码**不需要**被你加为协作者，也**不需要**用你的账号。
- **仓库是「私有 Private」时**：你必须在 GitHub 上把对方 **Invite** 进仓库（或用带权限的 Token），对方才能克隆。

本地跑作品集前请安装 **Node.js 20 或 22（LTS）** 与 **npm**（随 Node 安装）。建议克隆到**带名字的文件夹**，避免仓库名 `-` 与 shell 的 `cd -`（返回上一目录）混淆：

```bash
git clone https://github.com/liuyika3/-.git liuyikai-dmoes
cd liuyikai-dmoes/vibe-portfolio
npm install
npm run dev
```

---

## 怎么浏览（推荐）

主入口是 **`vibe-portfolio/`** 里的 React 作品集：左侧选条目，右侧内嵌预览；也可在每项里用「新标签」全屏打开。

```bash
cd vibe-portfolio
npm install
npm run dev
```

浏览器访问终端里提示的本地地址即可。生产构建与静态资源内嵌逻辑见该目录下的 `vite.config.ts` 与 `Dockerfile`。

---

## 仓库里大致有什么

| 方向 | 说明 | 在本仓库中的位置（示例） |
|------|------|--------------------------|
| **工具 · 自动化** | 浏览器内可用的效率与自动化原型（部分需本机服务或自行配置密钥） | `gemini_web_client/`、`mail-tool-gmail/` 等 |
| **产品 · Feature** | 独立功能或流程的界面 Demo（外食、Onboarding、万物教练视觉原型等） | `外食demo/`、`onboarding可视化demo/`、`万物教练api demos/` 等 |
| **减脂教练业务** | 业务体系总览（SPARE）与各维度下的功能界面示意 | **`减脂教练业务展示/`**（见下一节） |
| **科普 · 社媒向产出** | 适合信息流、公众号外跳的科普单页（多为主题化 HTML） | `workflow-demos/popular-science-posts/` |
| **方法论与长文页** | 独立方法论站点的构建产物入口（需在构建机配置 pre 路径） | 作品集内「Jovida Methodology（pre）」条目 |
| **演讲与需求文档** | Word / PDF / Markdown 等材料 | 仓库根目录及子目录中按需归档的 `.docx`、`.pdf`、`.md` 等 |

> 说明：部分工具依赖 OAuth、Vertex 或本地 Node 服务，**不等同于线上正式产品**；对外分享时注意密钥与隐私。

---

## 减脂教练业务展示：SPARE 五维与「点字母进功能」

在作品集里打开 **「减脂教练业务展示」**，会进入 **`减脂教练业务展示/index.html`** 的 **SPARE 总览页**。页面用单侧大括号把五个维度串在一起：**每一个字母都是可点击入口**；点击后会进入**针对该业务维度设计的 feature 子页**（界面示意、长图或录屏占位），用于说明「这一维在产品里长什么样、解决什么问题」。

五维与字母对应关系如下（与总览页文案一致）：

| 字母 | 维度名称 | 业务含义（一句话） | 点进去看什么 |
|:----:|----------|-------------------|----------------|
| **S** | **科学性** | 用可核对的营养信息与识别能力，支撑「吃得明白」 | 食物预识别相关界面：扫描、营养卡、Non-food、批量记录等（`modules/m4-pre-recognition.html`） |
| **P** | **个性化** | 同一食物在不同目标与偏好下的解释与建议 | 食物评分与分析：分数、结论与下一步建议（`modules/m3-food-scoring.html`） |
| **A** | **主动性** | 把长期行为拆成可完成的小任务，促使用户持续参与 | 每日挑战：打卡与任务卡片界面（`modules/m2-daily-challenge.html`） |
| **R** | **结果导向** | 把摄入与消耗组织成用户能感知、能坚持的叙事 | 结果叙事与动效节奏示意（`modules/m1-food-burn.html`） |
| **E** | **可落地性**（外食体系） | 在真实外食场景里仍能执行决策 | 外食体系：首页、菜谱与外食详情等界面物料（`modules/e-out-eating-system.html`） |

总览页副标题中的中文概括是：**科学性 · 个性化 · 主动性 · 结果导向 · 可落地性**。子页浏览完后，可用各子页内的 **「返回 SPARE 总览」** 回到字母导航。

---

## 技术栈（作品集壳）

- **Vite 7 + React 19 + TypeScript + Tailwind CSS 4**
- 开发/预览期通过中间件挂载 **`/__embed`** 等路径；生产构建时会将需要的静态 Demo 拷入 `dist`，便于纯静态托管。

---

## 在线作品集（发给别人的链接）

- **直接打开作品集页面（推荐）**：**[https://liuyika3.github.io/-/](https://liuyika3.github.io/-/)**  
  由 `main` 分支推送后自动构建部署（GitHub Actions → GitHub Pages）。**首次使用前**，请在仓库 **Settings → Pages** 中把 **Build and deployment** 的 **Source** 设为 **GitHub Actions**，保存后等待 Actions 里 **Deploy portfolio to GitHub Pages** 跑绿即可访问。

- **仓库与源码**：**[https://github.com/liuyika3/-](https://github.com/liuyika3/-)**

---

## 作者

**刘益恺** — 本仓库为个人作品集与实验归档，内容随项目迭代更新。

若你通过 Git 克隆本仓库，欢迎本地运行 `vibe-portfolio` 浏览；转载或商用页面中的具体文案与素材前，请先与作者确认授权。

---

## GitHub 推送（本机已配置专用 SSH）

本仓库的 `origin` 为 **`git@github.com:liuyika3/-.git`**。若在 Windows 上遇到 **`WARNING: UNPROTECTED PRIVATE KEY FILE`**（默认 `~/.ssh/id_ed25519` 权限过宽），OpenSSH 会拒绝使用该密钥。

**已采用做法：** 在 `~/.ssh/` 下使用专用密钥 **`id_ed25519_dmoes`**，并在本仓库内执行：

```bash
git config core.sshCommand "ssh -i <你的用户目录>/.ssh/id_ed25519_dmoes -o IdentitiesOnly=yes"
```

（当前机器上已由脚本写入；克隆到新电脑后请重新运行下方脚本。）

### 第一次把代码推上去

1. 在仓库根目录执行（或在 PowerShell 里 `cd` 到本仓库后执行）：

   ```powershell
   .\scripts\github-setup.ps1
   ```

2. 脚本会打印 **公钥**一整行。打开 GitHub：  
   **[SSH and GPG keys](https://github.com/settings/keys)** → **New SSH key**，标题随意（如 `dmoes PC`），把公钥粘贴进去保存。  
   （若只用这一把钥匙管该仓库，也可以在仓库 **Settings → Deploy keys** 里添加并勾选 **Allow write access**。）

3. 再执行一次 **`.\scripts\github-setup.ps1`**（或手动 `ssh -T git@github.com` 后 `git push -u origin main`）。看到 `Hi liuyika3! You've successfully authenticated...` 即表示 SSH 已通。

### 若 HTTPS 间歇连不上

部分网络环境下 Git 走 HTTP/2 会超时，可只对 GitHub 使用 HTTP/1.1：

```bash
git config --global http.https://github.com/.httpVersion HTTP/1.1
```

推送仍建议在浏览器登录 GitHub 时使用 **Personal Access Token** 作为密码，或使用 **Git Credential Manager**。
