import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createReadStream } from 'fs';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_PORT = Number.parseInt(process.env.MAIL_TOOL_PORT || '3012', 10) || 3012;

const ACCOUNTS_PATH = path.join(__dirname, '.google-accounts.json');

let serverBaseUrl = null; // set after listen
const usedAuthCodes = new Set();
let oauthExchanging = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAccountsData() {
  try {
    const raw = await fs.readFile(ACCOUNTS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { activeAccount: null, accounts: {} };
  }
}

async function saveAccountsData(data) {
  await fs.writeFile(ACCOUNTS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function httpsJson({ method, host, path: p, headers, body }) {
  return new Promise((resolve, reject) => {
    const options = { method, host, path: p, headers: { ...(headers || {}) } };
    const proxyUrl =
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      process.env.ALL_PROXY ||
      '';

    if (host.includes('google') && proxyUrl) {
      import('https-proxy-agent')
        .then(({ HttpsProxyAgent }) => {
          options.agent = new HttpsProxyAgent(proxyUrl);
          doReq(options);
        })
        .catch(() => {
          doReq(options);
        });
    } else {
      doReq(options);
    }

    function doReq(opts) {
      const req = https.request(
        opts,
        (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data || '{}');
            resolve({ statusCode: res.statusCode, body: parsed, raw: data });
          } catch {
            resolve({ statusCode: res.statusCode, body: null, raw: data });
          }
        });
      }
    );
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    }
  });
}

async function exchangeCodeForToken(code, redirectUri, clientId, clientSecret) {
  if (!clientSecret) throw new Error('Missing GOOGLE_CLIENT_SECRET. 请先配置 Client Secret');
  const payload = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  }).toString();
  const r = await httpsJson({
    method: 'POST',
    host: 'oauth2.googleapis.com',
    path: '/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8', 'Content-Length': Buffer.byteLength(payload) },
    body: payload,
  });
  if (r.statusCode !== 200 || !r.body) throw new Error(`token exchange failed: ${r.raw}`);
  if (r.body.error) throw new Error(`token exchange failed: ${r.body.error_description || r.body.error}`);
  
  const tokenData = r.body;
  if (!tokenData || !tokenData.access_token) {
    throw new Error(`token exchange missing data: ${r.raw}`);
  }
  return tokenData;
}

async function refreshUserToken(refreshToken, clientId, clientSecret) {
  if (!clientSecret) throw new Error('Missing GOOGLE_CLIENT_SECRET');
  const payload = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  }).toString();
  const r = await httpsJson({
    method: 'POST',
    host: 'oauth2.googleapis.com',
    path: '/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8', 'Content-Length': Buffer.byteLength(payload) },
    body: payload,
  });
  if (r.statusCode !== 200 || !r.body) throw new Error(`token refresh failed: ${r.raw}`);
  if (r.body.error) {
    if (r.body.error === 'unauthorized_client') {
      throw new Error(`UNAUTHORIZED_CLIENT_REFRESH:${r.body.error_description || r.body.error}`);
    }
    throw new Error(`token refresh failed: ${r.body.error_description || r.body.error}`);
  }
  
  const tokenData = r.body;
  if (!tokenData || !tokenData.access_token) {
    throw new Error(`token refresh missing data: ${r.raw}`);
  }
  return tokenData;
}

async function getValidUserToken() {
  const accountsData = await getAccountsData();
  const activeEmail = accountsData.activeAccount;
  if (!activeEmail || !accountsData.accounts[activeEmail]) return null;

  const account = accountsData.accounts[activeEmail];
  const t = account.token;
  if (!t) return null;

  const now = Math.floor(Date.now() / 1000);
  if (t.expires_at && now < t.expires_at - 120) return t.access_token;

  if (t.refresh_token) {
    let nt;
    try {
      nt = await refreshUserToken(t.refresh_token, account.clientId, account.clientSecret);
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.startsWith('UNAUTHORIZED_CLIENT_REFRESH:')) {
        // Self-heal: clear token for this account
        account.token = null;
        await saveAccountsData(accountsData);
        return null;
      }
      throw e;
    }
    const merged = {
      ...t,
      ...nt,
      expires_at: now + (nt.expires_in || 0),
    };
    account.token = merged;
    await saveAccountsData(accountsData);
    return merged.access_token;
  }
  return null;
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function sha256(text) {
  return crypto.createHash('sha256').update(String(text ?? ''), 'utf8').digest('hex');
}

function base64urlEncodeUtf8(text) {
  const b64 = Buffer.from(String(text ?? ''), 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlEncodeBuffer(buf) {
  const b64 = Buffer.from(buf).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function looksLikeDataUrl(s) {
  return typeof s === 'string' && s.startsWith('data:') && s.includes(';base64,');
}

function parseDataUrl(dataUrl) {
  // data:<mime>;base64,<payload>
  const m = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const b64 = m[2];
  return { mime, buffer: Buffer.from(b64, 'base64') };
}

function extFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  if (m === 'image/gif') return 'gif';
  if (m === 'image/webp') return 'webp';
  return 'bin';
}

/**
 * Parses a raw recipient string into an array of { email, name } objects.
 * Supports formats:
 *   - email@example.com
 *   - 姓名 <email@example.com>
 *   - "姓名" <email@example.com>
 * Splits on commas, semicolons, or newlines.
 */
function parseRecipients(raw) {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(token => {
      const angleMatch = token.match(/^"?([^"<]*?)"?\s*<([^>]+)>$/);
      if (angleMatch) {
        return { name: angleMatch[1].trim() || null, email: angleMatch[2].trim() };
      }
      return { name: null, email: token };
    })
    .filter(r => r.email.includes('@'));
}

function makeJobId() {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// In-memory job store (no DB by design)
const jobs = new Map(); // jobId -> job

const JOBS_STORE_PATH = path.join(__dirname, '.gmail-mail-tool-jobs.json');
let jobsPersistTimer = null;

function jobToPersisted(job) {
  // Drop non-serializable/runtime fields
  const {
    _resumeWaiters,
    ...rest
  } = job || {};
  return rest;
}

function persistedToJob(obj) {
  const job = { ...(obj || {}) };
  job._resumeWaiters = [];
  // If the process restarted, any "running" job should resume as "scheduled"
  if (job.status === 'running') job.status = 'scheduled';
  // Ensure arrays exist
  if (!Array.isArray(job.results)) job.results = [];
  if (!Array.isArray(job.recipients)) job.recipients = [];
  if (!Array.isArray(job.inlineImages)) job.inlineImages = [];
  return job;
}

async function persistJobsNow() {
  const payload = {
    savedAt: Date.now(),
    jobs: Array.from(jobs.values()).map(jobToPersisted),
  };
  await fs.writeFile(JOBS_STORE_PATH, JSON.stringify(payload, null, 2), 'utf8');
}

function schedulePersistJobs() {
  if (jobsPersistTimer) return;
  jobsPersistTimer = setTimeout(async () => {
    jobsPersistTimer = null;
    try {
      await persistJobsNow();
    } catch (e) {
      console.error('[WARN] persistJobs failed', e);
    }
  }, 500);
}

async function loadJobsFromDisk() {
  try {
    const raw = await fs.readFile(JOBS_STORE_PATH, 'utf8');
    const data = JSON.parse(raw);
    const list = Array.isArray(data?.jobs) ? data.jobs : [];
    for (const j of list) {
      const job = persistedToJob(j);
      if (!job?.id) continue;
      jobs.set(job.id, job);
    }
    // Auto-resume unfinished jobs
    for (const job of jobs.values()) {
      const finished = job.status === 'completed' || job.status === 'cancelled' || job.status === 'failed';
      if (finished) continue;
      if (job.cursor >= (job.recipients?.length || 0)) continue;
      // resume in background
      setTimeout(() => runJobWorker(job), 0);
    }
  } catch {
    // ignore if file doesn't exist / invalid json
  }
}

function publicJobView(job) {
  return {
    id: job.id,
    status: job.status, // scheduled | running | paused | completed | cancelled | failed
    createdAt: job.createdAt,
    startAt: job.startAt,
    intervalMinutes: job.intervalMinutes,
    batchSize: job.batchSize,
    total: job.total,
    cursor: job.cursor,
    sent: job.sent,
    failed: job.failed,
    lastError: job.lastError,
    lastSentAt: job.lastSentAt,
    nextRunAt: job.nextRunAt,
  };
}

async function runJobWorker(job) {
  try {
    if (job.status !== 'scheduled' && job.status !== 'running') return;

    job.status = 'running';
    job.lastError = null;
    schedulePersistJobs();

    // Initial delay until startAt (if provided)
    if (job.startAt && Date.now() < job.startAt) {
      job.nextRunAt = job.startAt;
      while (Date.now() < job.startAt) {
        if (job.status === 'cancelled') return;
        if (job.status === 'paused') { await waitUntilResumed(job); continue; }
        await sleep(Math.min(1000, job.startAt - Date.now()));
      }
    }

    while (job.cursor < job.recipients.length) {
      if (job.status === 'cancelled') return;
      if (job.status === 'paused') { await waitUntilResumed(job); continue; }

      const batch = job.recipients.slice(job.cursor, job.cursor + job.batchSize);
      job.nextRunAt = null;

      for (const r of batch) {
        if (job.status === 'cancelled') return;
        if (job.status === 'paused') { await waitUntilResumed(job); }

        let finalSubject = job.subject || '';
        let finalBody = job.emailBody || '';
        if (job.personalization) {
          const name = r.name || r.email.split('@')[0];
          finalSubject = finalSubject.replace(/\{\{姓名\}\}/g, name);
          finalBody = finalBody.replace(/\{\{姓名\}\}/g, name);
        }

          try {
            const { message_id } = await sendMail(r.email, finalSubject, finalBody, { plainText: false, inlineImages: job.inlineImages });
            
            job.results.push({
            email: r.email,
            name: r.name,
            success: !!message_id,
            message_id,
            deliveryStatus: message_id ? 4 : null,
            deliveryStatusText: message_id ? '发送成功' : '发送失败',
            note: message_id ? 'Gmail API 已受理' : '未知错误',
            at: Date.now(),
          });

          if (message_id) job.sent += 1;
          else job.failed += 1;
          job.lastSentAt = Date.now();
        } catch (err) {
          job.results.push({ email: r.email, name: r.name, success: false, error: err.message, at: Date.now() });
          job.failed += 1;
          job.lastError = err.message;
        } finally {
          job.cursor += 1;
          schedulePersistJobs();
        }
      }

      if (job.cursor >= job.recipients.length) break;

      // Wait until next interval
      const waitMs = Math.max(0, job.intervalMinutes * 60_000);
      job.nextRunAt = Date.now() + waitMs;
      const deadline = job.nextRunAt;
      schedulePersistJobs();
      while (Date.now() < deadline) {
        if (job.status === 'cancelled') return;
        if (job.status === 'paused') { await waitUntilResumed(job); continue; }
        await sleep(Math.min(1000, deadline - Date.now()));
      }
    }

    if (job.status !== 'cancelled') job.status = 'completed';
    job.nextRunAt = null;
    schedulePersistJobs();
  } catch (err) {
    job.status = 'failed';
    job.lastError = err.message;
    job.nextRunAt = null;
    schedulePersistJobs();
  }
}

function waitUntilResumed(job) {
  if (job.status !== 'paused') return Promise.resolve();
  return new Promise(resolve => job._resumeWaiters.push(resolve));
}

function resumeJob(job) {
  job.status = 'running';
  const waiters = job._resumeWaiters.splice(0, job._resumeWaiters.length);
  for (const w of waiters) w();
}


/**
 * Calls lark-cli to send one email. Returns { message_id } on success.
 */

/**
 * Send mail via official OpenAPI (avoids MIME line folding that inserts newlines into HTML).
 * API requires base64url encoding for body_html/body_plain_text.
 */


/**
 * Constructs a raw RFC 2822 email message with support for HTML and inline images.
 */
async function buildRawEmail(to, subject, bodyHtml, { plainText = false, inlineImages = [] } = {}) {
  const boundary = `----=_Part_${crypto.randomBytes(16).toString('hex')}`;
  let raw = '';
  raw += `To: ${to}\r\n`;
  raw += `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=\r\n`;
  raw += `MIME-Version: 1.0\r\n`;

  if (plainText) {
    raw += `Content-Type: text/plain; charset="utf-8"\r\n\r\n`;
    raw += `${bodyHtml}\r\n`;
    return raw;
  }

  if (inlineImages && inlineImages.length > 0) {
    raw += `Content-Type: multipart/related; boundary="${boundary}"\r\n\r\n`;
    raw += `--${boundary}\r\n`;
    raw += `Content-Type: text/html; charset="utf-8"\r\n\r\n`;
    raw += `${bodyHtml}\r\n\r\n`;

    for (const img of inlineImages) {
      if (!img?.cid || !img?.file_path) continue;
      const buf = await fs.readFile(img.file_path);
      const b64 = Buffer.from(buf).toString('base64');
      // chunk base64 to 76 chars per line for RFC compliance
      const chunked = b64.match(/.{1,76}/g).join('\r\n');
      
      raw += `--${boundary}\r\n`;
      raw += `Content-Type: image/${path.extname(img.file_path).replace('.', '') || 'png'}; name="${path.basename(img.file_path)}"\r\n`;
      raw += `Content-Disposition: inline; filename="${path.basename(img.file_path)}"\r\n`;
      raw += `Content-Transfer-Encoding: base64\r\n`;
      raw += `Content-ID: <${img.cid}>\r\n\r\n`;
      raw += `${chunked}\r\n\r\n`;
    }
    raw += `--${boundary}--\r\n`;
  } else {
    raw += `Content-Type: text/html; charset="utf-8"\r\n\r\n`;
    raw += `${bodyHtml}\r\n`;
  }

  return raw;
}

async function sendMail(to, subject, bodyHtml, { plainText = false, inlineImages = [] } = {}) {
  const accessToken = await getValidUserToken();
  if (!accessToken) {
    throw new Error('未授权，请先登录');
  }

  const rawMessage = await buildRawEmail(to, subject, bodyHtml, { plainText, inlineImages });
  // Gmail API requires base64url encoding for the raw RFC 2822 message
  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const payload = JSON.stringify({
    raw: encodedMessage
  });

  const r = await httpsJson({
    method: 'POST',
    host: 'gmail.googleapis.com',
    path: '/gmail/v1/users/me/messages/send',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
      Authorization: `Bearer ${accessToken}`,
    },
    body: payload,
  });

  if (r.statusCode !== 200 || !r.body) {
    throw new Error(`mail send failed: ${r.raw}`);
  }
  
  return { message_id: r.body.id || null };
}


// Removing Feishu status polling
const SEND_STATUS_TEXT = new Map([
  [1, '正在投递'],
  [4, '投递成功'],
]);

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  try {
    // Base URL is only used for parsing pathname/query.
    const url = new URL(req.url, 'http://localhost');

    // GET /api/auth/status
    if (req.method === 'GET' && url.pathname === '/api/auth/status') {
      try {
        const accountsData = await getAccountsData();
        const activeEmail = accountsData.activeAccount;
        if (!activeEmail || !accountsData.accounts[activeEmail] || !accountsData.accounts[activeEmail].token) {
          json(res, 200, { authenticated: false });
          return;
        }
        json(res, 200, { authenticated: true, activeAccount: activeEmail });
      } catch (e) {
        json(res, 500, { error: String(e) });
      }
      return;
    }

    // POST /api/auth/config
    if (req.method === 'POST' && url.pathname === '/api/auth/config') {
      try {
        const body = await readBody(req);
        const { client_id, client_secret, email } = body;
        
        if (!client_id || !client_secret) {
          json(res, 400, { error: '缺少 Client ID 或 Client Secret' });
          return;
        }
        if (!email) {
          json(res, 400, { error: '缺少邮箱' });
          return;
        }

        const accountsData = await getAccountsData();
        if (!accountsData.accounts) accountsData.accounts = {};
        if (!accountsData.accounts[email]) accountsData.accounts[email] = {};
        accountsData.accounts[email].clientId = client_id;
        accountsData.accounts[email].clientSecret = client_secret;
        accountsData.activeAccount = email;
        await saveAccountsData(accountsData);
        
        if (!serverBaseUrl) serverBaseUrl = `http://127.0.0.1:${BASE_PORT}`;
        const redirectUri = `${serverBaseUrl}/oauth/callback`;
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', client_id);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.send');
        authUrl.searchParams.set('state', email);

        json(res, 200, { authUrl: authUrl.toString() });
      } catch (e) {
        json(res, 500, { error: String(e) });
      }
      return;
    }

    // POST /api/auth/logout
    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      try {
        const accountsData = await getAccountsData();
        if (accountsData.activeAccount && accountsData.accounts && accountsData.accounts[accountsData.activeAccount]) {
          accountsData.accounts[accountsData.activeAccount].token = null;
          await saveAccountsData(accountsData);
        }
        json(res, 200, { success: true });
      } catch (e) {
        json(res, 500, { error: String(e) });
      }
      return;
    }

    // GET /oauth/start — print authorize URL
    if (req.method === 'GET' && url.pathname === '/oauth/start') {
      const accountsData = await getAccountsData();
      const activeEmail = accountsData.activeAccount;
      if (!activeEmail || !accountsData.accounts || !accountsData.accounts[activeEmail] || !accountsData.accounts[activeEmail].clientId) {
         res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
         res.end('未配置 Client ID。请先在首页填写邮箱及对应的 Client ID/Secret。');
         return;
      }
      const account = accountsData.accounts[activeEmail];
      if (!serverBaseUrl) serverBaseUrl = `http://127.0.0.1:${BASE_PORT}`;
      const redirectUri = `${serverBaseUrl}/oauth/callback`;
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', account.clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.send');
      authUrl.searchParams.set('state', activeEmail);
      
      const setupInstructions = `
=============================================
Gmail OAuth2 配置指南
=============================================
1. 访问 https://console.cloud.google.com/ 
2. 创建一个新项目，搜索并启用 "Gmail API"
3. 进入 "OAuth consent screen" (OAuth 同意屏幕):
   - User Type: External (或者 Internal)
   - 填写 App name 和 Developer contact information
4. 进入 "Credentials" (凭据):
   - 点击 "Create Credentials" -> "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs 添加两项:
     http://127.0.0.1:3012/oauth/callback
     http://localhost:3012/oauth/callback
5. 拿到 Client ID 和 Client Secret，回到工具首页填写。
6. 打开下方链接授权：

${authUrl.toString()}
`;
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(setupInstructions);
      return;
    }

    // GET /oauth/callback?code=...&state=...
    if (req.method === 'GET' && url.pathname === '/oauth/callback') {
      const code = url.searchParams.get('code');
      const email = url.searchParams.get('state');
      if (!code) { res.writeHead(400); res.end('missing code'); return; }
      if (!email) { res.writeHead(400); res.end('missing state (email)'); return; }

      const redirectUri = `${serverBaseUrl || `http://127.0.0.1:${BASE_PORT}`}/oauth/callback`;
      try {
        const accountsData = await getAccountsData();
        const account = accountsData.accounts && accountsData.accounts[email];
        if (!account) { res.writeHead(400); res.end('找不到此邮箱的配置。请先在主页配置 client_id'); return; }

        if (account.token?.access_token) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h2>已授权</h2><p>已检测到此账号 token（无需重复授权）。回到邮件工具继续发送即可。</p>`);
          return;
        }

        if (usedAuthCodes.has(code)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h2>授权已处理</h2><p>该 code 已经使用过。请回到邮件工具继续发送。</p>`);
          return;
        }
        if (oauthExchanging) {
          res.writeHead(429, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('正在处理授权，请稍后刷新一次（不要重复打开多个回调标签页）');
          return;
        }
        oauthExchanging = true;
        usedAuthCodes.add(code);

        const data = await exchangeCodeForToken(code, redirectUri, account.clientId, account.clientSecret);
        const now = Math.floor(Date.now() / 1000);
        const token = {
          ...data,
          expires_at: now + (data.expires_in || 0),
          obtained_at: now,
        };
        account.token = token;
        accountsData.activeAccount = email;
        await saveAccountsData(accountsData);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h2>授权成功</h2><p>已成功绑定 <b>${email}</b>，你可以回到邮件工具继续发送。</p>
        <script>
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        </script>
        `);
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        const msg = String(e?.message || e);
        if (msg.includes('invalid_grant') || msg.includes('"code":20003')) {
          res.end(`授权失败：授权码已被使用（只能用一次）。请回到 /oauth/start 重新发起授权，并且不要刷新回调页。\n\n${msg}`);
        } else if (msg.includes('token exchange')) {
          res.end(`授权失败：换取 token 失败（请把下方原始响应发我排查）。\n\n${msg}`);
        } else {
          res.end(`授权失败: ${msg}`);
        }
      } finally {
        oauthExchanging = false;
      }
      return;
    }

    // GET /uploads/<file> — serve uploaded images for preview
    if (req.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      const rel = url.pathname.replace(/^\/uploads\//, '');
      const safe = rel.replace(/[^a-zA-Z0-9._-]/g, '');
      const filePath = path.join(__dirname, 'uploads', safe);
      try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        const ct = ext === '.png' ? 'image/png'
          : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg'
          : ext === '.gif' ? 'image/gif'
          : ext === '.webp' ? 'image/webp'
          : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-store' });
        createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
      return;
    }

    // GET / — serve frontend
    if (req.method === 'GET' && url.pathname === '/') {
      const html = await fs.readFile(path.join(__dirname, 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    // POST /api/inline-image — upload an inline image (dataUrl) for CID embedding
    if (req.method === 'POST' && url.pathname === '/api/inline-image') {
      const body = await readBody(req);
      const { dataUrl, filename } = body || {};
      if (!looksLikeDataUrl(dataUrl)) { json(res, 400, { error: 'dataUrl required (data:*;base64,...)' }); return; }
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) { json(res, 400, { error: 'invalid dataUrl' }); return; }
      const maxBytes = 5 * 1024 * 1024;
      if (parsed.buffer.length > maxBytes) { json(res, 400, { error: 'image too large (max 5MB)' }); return; }

      const uploadsDir = path.join(__dirname, 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      const ext = extFromMime(parsed.mime);
      const id = crypto.randomBytes(10).toString('hex');
      const safeName = (filename && String(filename).trim()) ? String(filename).trim().replace(/[^a-zA-Z0-9._-]/g, '') : `img_${id}.${ext}`;
      const outName = `${id}_${safeName}`;
      const outPath = path.join(uploadsDir, outName);
      await fs.writeFile(outPath, parsed.buffer);

      const cid = `banner_${id}`;
      json(res, 200, {
        cid,
        filePath: outPath,
        url: `/uploads/${outName}`,
        mime: parsed.mime,
        size: parsed.buffer.length,
      });
      return;
    }

    // POST /api/preview
    if (req.method === 'POST' && url.pathname === '/api/preview') {
      const body = await readBody(req);
      const { recipients: rawRecipients, subject, body: emailBody, personalization, plainText } = body;
      const recipients = parseRecipients(rawRecipients || '');
      const bodyHash = sha256(emailBody || '');

      const previews = recipients.map(r => {
        let finalSubject = subject || '';
        let finalBody = emailBody || '';
        if (personalization) {
          const name = r.name || r.email.split('@')[0];
          finalSubject = finalSubject.replace(/\{\{姓名\}\}/g, name);
          finalBody = finalBody.replace(/\{\{姓名\}\}/g, name);
        }
        return {
          email: r.email,
          name: r.name,
          subject: finalSubject,
          body: finalBody,
          bodyHash,
          plainText: !!plainText,
        };
      });

        json(res, 200, {
        from: 'Your Gmail Account',
        previews,
        count: previews.length,
        bodyHash,
      });
      return;
    }

    // POST /api/send
    if (req.method === 'POST' && url.pathname === '/api/send') {
      const body = await readBody(req);
      const { recipients: rawRecipients, subject, body: emailBody, personalization, plainText, inlineImages } = body;
      const recipients = parseRecipients(rawRecipients || '');
      const bodyHash = sha256(emailBody || '');

      // Fast auth check once per request (avoid repeated refresh attempts per recipient)
      const tokenCheck = await getValidUserToken();
      if (!tokenCheck) {
        json(res, 401, {
          error: 'AUTH_REQUIRED',
          message:
            'Gmail 授权已失效（常见原因：你更换了 OAuth Client 或重置了 Client Secret）。我已经自动清理了本机旧 token。请点击右上角“换号 / 重新授权”重新登录一次。',
          bodyHash,
        });
        return;
      }

      const results = [];
      for (const r of recipients) {
        let finalSubject = subject || '';
        let finalBody = emailBody || '';
        if (personalization) {
          const name = r.name || r.email.split('@')[0];
          finalSubject = finalSubject.replace(/\{\{姓名\}\}/g, name);
          finalBody = finalBody.replace(/\{\{姓名\}\}/g, name);
        }

        try {
            const { message_id } = plainText
              ? await sendMail(r.email, finalSubject, finalBody, { plainText: true })
              : await sendMail(r.email, finalSubject, finalBody, { plainText: false, inlineImages });
          
          results.push({
            email: r.email,
            name: r.name,
            success: !!message_id,
            delivered: !!message_id,
            message_id,
            deliveryStatus: message_id ? 4 : null,
            deliveryStatusText: message_id ? '发送成功' : '发送失败',
            note: message_id ? 'Gmail API 已受理' : '未知错误',
            bodyHash,
            plainText: !!plainText,
          });
        } catch (err) {
          results.push({ email: r.email, name: r.name, success: false, error: err.message, bodyHash, plainText: !!plainText });
        }
      }

      const sent = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      json(res, 200, { results, sent, failed, bodyHash });
      return;
    }

    // POST /api/schedule — create a throttled sending job
    if (req.method === 'POST' && url.pathname === '/api/schedule') {
      const body = await readBody(req);
      const {
        recipients: rawRecipients,
        subject,
        body: emailBody,
        personalization,
        batchSize,
        intervalMinutes,
        startAt,
        inlineImages,
      } = body;

      const recipients = parseRecipients(rawRecipients || '');
      const bs = Math.max(1, Math.min(200, parseInt(batchSize, 10) || 10));
      const iv = Math.max(1, Math.min(24 * 60, parseInt(intervalMinutes, 10) || 10));
      const startAtMs = startAt ? Date.parse(startAt) : null;

      const job = {
        id: makeJobId(),
        status: 'scheduled',
        createdAt: Date.now(),
        startAt: Number.isFinite(startAtMs) ? startAtMs : null,
        intervalMinutes: iv,
        batchSize: bs,
        subject: subject || '',
        emailBody: emailBody || '',
        personalization: !!personalization,
        inlineImages: Array.isArray(inlineImages) ? inlineImages : [],
        recipients,
        total: recipients.length,
        cursor: 0,
        sent: 0,
        failed: 0,
        results: [],
        lastError: null,
        lastSentAt: null,
        nextRunAt: null,
        _resumeWaiters: [],
      };

      jobs.set(job.id, job);
      runJobWorker(job); // fire-and-forget
      schedulePersistJobs();

      json(res, 200, { job: publicJobView(job) });
      return;
    }

    // GET /api/jobs — list jobs
    if (req.method === 'GET' && url.pathname === '/api/jobs') {
      const list = Array.from(jobs.values())
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(publicJobView);
      json(res, 200, { jobs: list });
      return;
    }

    // GET /api/jobs/:id — job detail (including recent results)
    const jobMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)$/);
    if (req.method === 'GET' && jobMatch) {
      const id = jobMatch[1];
      const job = jobs.get(id);
      if (!job) { json(res, 404, { error: 'Job not found' }); return; }
      const recent = job.results.slice(-200); // cap payload
      json(res, 200, { job: publicJobView(job), recentResults: recent });
      return;
    }

    // POST /api/jobs/:id/pause|resume|cancel
    const actionMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)\/(pause|resume|cancel)$/);
    if (req.method === 'POST' && actionMatch) {
      const id = actionMatch[1];
      const action = actionMatch[2];
      const job = jobs.get(id);
      if (!job) { json(res, 404, { error: 'Job not found' }); return; }

      if (action === 'pause') {
        if (job.status === 'running' || job.status === 'scheduled') job.status = 'paused';
      } else if (action === 'resume') {
        if (job.status === 'paused') resumeJob(job);
      } else if (action === 'cancel') {
        job.status = 'cancelled';
        resumeJob(job); // unblock worker if paused
      }
      schedulePersistJobs();

      json(res, 200, { job: publicJobView(job) });
      return;
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) {
    json(res, 500, { error: err.message });
  }
});

function listenWithFallback(server, startPort, maxAttempts = 20) {
  let port = startPort;
  let attempts = 0;
  const allowFallback = (process.env.MAIL_TOOL_ALLOW_FALLBACK || '').toLowerCase() === 'true';

  const tryListen = () => {
    attempts += 1;
    server.listen(port, () => {
      serverBaseUrl = `http://127.0.0.1:${port}`;
      console.log(`Mail Tool running at http://localhost:${port}`);
    });
  };

  server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE' && allowFallback && attempts < maxAttempts) {
      port += 1;
      setTimeout(tryListen, 50);
      return;
    }
    console.error(err);
    process.exit(1);
  });

  tryListen();
}

process.on('uncaughtException', (e) => {
  console.error('[FATAL] uncaughtException', e);
});
process.on('unhandledRejection', (e) => {
  console.error('[FATAL] unhandledRejection', e);
});

await loadJobsFromDisk();

listenWithFallback(server, BASE_PORT);
