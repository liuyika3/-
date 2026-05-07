# 飞书邮件群发工具 — 交接文档

## 项目位置

```
C:\Users\2025lyk\Desktop\openclaw works\3001_Server_Project\mail-tool\
├── server.mjs     ← Node.js 后端（HTTP服务器 + lark-cli 调用）
├── index.html     ← 前端界面（单文件，无构建依赖）
└── HANDOFF.md     ← 本文件
```

## 启动方式

```bash
node "C:\Users\2025lyk\Desktop\openclaw works\3001_Server_Project\mail-tool\server.mjs"
```

访问：启动后看控制台输出，形如 `Mail Tool running at http://localhost:3011`  
推荐用浏览器打开：`http://127.0.0.1:<实际端口>/`

> 前提：需要 lark-cli 已登录飞书账号（`lark-cli` 或 Node 路径下的 `@larksuite/cli`）

---

## 技术架构

- **纯 Node.js**，无框架，无依赖包，开箱即用
- **后端** (`server.mjs`)：原生 `http` 模块，默认尝试 3011，端口占用会自动递增（3012/3013/...）
- **前端** (`index.html`)：单文件 HTML，无打包，直接由后端 serve
- **邮件发送**（关键）：优先用 `lark-cli api POST /open-apis/mail/v1/.../messages/send`（更稳定，避免断词空格）；权限不足时回退到 `lark-cli mail +send`

---

## API 接口

### `POST /api/preview`
预览邮件（不发送），返回每个收件人的渲染结果。

**Request body:**
```json
{
  "recipients": "张三 <zhangsan@example.com>\n李四 <lisi@example.com>",
  "subject": "主题",
  "body": "<p>正文 HTML</p>",
  "personalization": true,
  "plainText": false
}
```

**Response:**
```json
{
  "from": "liuyikai@fluxvita.com",
  "previews": [
    { "email": "zhangsan@example.com", "name": "张三", "subject": "主题", "body": "...", "bodyHash": "..." }
  ],
  "count": 1,
  "bodyHash": "..."
}
```

---

### `POST /api/send`
实际发送邮件，并查询每封邮件的发送状态。

**Request body:** 同 `/api/preview`

**Response:**
```json
{
  "results": [
    {
      "email": "...",
      "name": "...",
      "success": true,
      "message_id": "...",
      "deliveryStatus": 4,
      "deliveryStatusText": "投递成功",
      "bodyHash": "..."
    }
  ],
  "sent": 1,
  "failed": 0,
  "bodyHash": "..."
}
```

> success 的判定：只有投递状态为 4（投递成功）才算成功。

---

### `POST /api/schedule`（定时/分批发送）

用于大名单分批发送防风控（每 X 分钟发送 Y 封），并支持暂停/继续/取消。

相关接口：
- `POST /api/schedule`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `POST /api/jobs/:id/pause|resume|cancel`

---

## 核心功能说明

### 收件人解析
支持三种格式，混合使用，用逗号/分号/换行分隔：
```
alice@example.com
张三 <zhangsan@example.com>
"李四" <lisi@example.com>
```

### 个性化替换
开启「个性化」开关后，主题和正文中的 `{{姓名}}` 会自动替换为每位收件人的姓名（无姓名时用邮箱前缀）。

### 富文本编辑器
正文区域支持加粗、斜体、下划线、删除线、标题、列表、链接。  
发送时自动将 HTML 包裹字体样式，兼容主流邮件客户端。

### 发送状态查询
发送后自动调用 `lark-cli mail user_mailbox.messages send_status` 查询投递状态，显示在结果表格中。

### 为什么会出现“词中间莫名空格/断词”
已通过拉取已发送邮件的 `body_html` 验证：`mail +send` 这条链路可能在 HTML 源码中插入换行（例如 `t\nhoughts`），客户端渲染会把它当空白导致断词空格。  
因此后端优先改为调用 OpenAPI `messages/send` 来规避该问题。

---

## lark-cli 调用细节

Windows 下不直接调用 `lark-cli` 命令，而是用：
```js
node %USERPROFILE%\.npm-global\node_modules\@larksuite\cli\scripts\run.js
```
避免 Windows cmd.exe 的引号转义问题。

实际调用示例：
```bash
node run.js mail +send \
  --to "zhangsan@example.com" \
  --subject "主题" \
  --body "<p>正文</p>" \
  --confirm-send \
  --as user
```

### 推荐权限（让 OpenAPI send 可用）
建议同事配置/申请 `mail:user_mailbox.message:send` 权限（否则会回退到 `mail +send`，断词空格风险会上来）。

---

## 发件人

发件人由飞书邮箱/当前登录用户决定（OpenAPI send 走 `me` 邮箱）。如需指定 from，需要扩展 API 参数/邮箱配置。

---

## 已知限制 / 可扩展方向

| 限制 | 说明 |
|------|------|
| 无附件支持 | lark-cli 当前调用未传附件参数 |
| 无发送频率控制 | 大批量时全部并发，可能触发飞书限流 |
| 无草稿保存 | 刷新页面内容清空 |
| HTML body | 飞书 API 接受 HTML，但部分样式在客户端渲染可能有差异 |

**可扩展：**
- 加 CSV 导入收件人
- 加发送延迟/间隔控制（`setTimeout` + 串行队列）
- 加模板保存功能（`localStorage`）
- 加附件上传（需扩展 lark-cli 调用参数）
