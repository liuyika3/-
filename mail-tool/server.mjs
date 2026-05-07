import http from 'http';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createReadStream } from 'fs';
import https from 'https';

// Invoke lark-cli's underlying Node.js script directly — avoids cmd.exe shell quoting issues on Windows
const [LARK_BIN, LARK_PREFIX_ARGS] = process.platform === 'win32'
  ? ['node', [`${process.env.USERPROFILE}\\.npm-global\\node_modules\\@larksuite\\cli\\scripts\\run.js`]]
  : ['lark-cli', []];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_PORT = Number.parseInt(process.env.MAIL_TOOL_PORT || '3011', 10) || 3011;
let OAUTH_APP_ID = process.env.FEISHU_APP_ID || process.env.LARK_APP_ID || 'cli_a9416daec5f9dcb6';
let OAUTH_APP_SECRET = process.env.FEISHU_APP_SECRET || process.env.LARK_APP_SECRET || '';
const OAUTH_TOKEN_PATH = path.join(__dirname, '.oauth-token.json');
const OAUTH_APP_PATH = path.join(__dirname, '.oauth-app.json');
let serverBaseUrl = null; // set after listen
const usedAuthCodes = new Set();
let oauthExchanging = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function readOauthToken() {
  try {
    const raw = await fs.readFile(OAUTH_TOKEN_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadOauthAppFromFile() {
  if (OAUTH_APP_SECRET) return;
  try {
    const raw = await fs.readFile(OAUTH_APP_PATH, 'utf8');
    const cfg = JSON.parse(raw);
    if (cfg?.app_id && !process.env.FEISHU_APP_ID && !process.env.LARK_APP_ID) OAUTH_APP_ID = cfg.app_id;
    if (cfg?.app_secret) OAUTH_APP_SECRET = cfg.app_secret;
  } catch {
    // ignore
  }
}

async function writeOauthToken(token) {
  await fs.writeFile(OAUTH_TOKEN_PATH, JSON.stringify(token, null, 2), 'utf8');
}

function httpsJson({ method, host, path: p, headers, body }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { method, host, path: p, headers: { ...(headers || {}) } },
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
  });
}

async function exchangeCodeForToken(code, redirectUri) {
  await loadOauthAppFromFile();
  if (!OAUTH_APP_SECRET) throw new Error('Missing FEISHU_APP_SECRET');
  const payload = JSON.stringify({
    grant_type: 'authorization_code',
    client_id: OAUTH_APP_ID,
    client_secret: OAUTH_APP_SECRET,
    code,
    redirect_uri: redirectUri,
  });
  const r = await httpsJson({
    method: 'POST',
    host: 'open.feishu.cn',
    path: '/open-apis/authen/v2/oauth/token',
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(payload) },
    body: payload,
  });
  if (r.statusCode !== 200 || !r.body) throw new Error(`token exchange failed: ${r.raw}`);
  // Feishu returns { code, msg, data } on success; may return { error, error_description, code } or other shapes on failure.
  if ((typeof r.body.code === 'number' && r.body.code !== 0) || r.body.error) {
    throw new Error(`token exchange failed: ${r.raw}`);
  }
  
  // Feishu might return { data: { access_token... } } or { access_token... } directly.
  const tokenData = r.body.data || r.body;
  if (!tokenData || !tokenData.access_token) {
    throw new Error(`token exchange missing data: ${r.raw}`);
  }
  if (typeof tokenData.expires_in !== 'number') {
    tokenData.expires_in = 0;
  }
  return tokenData;
}

async function refreshUserToken(refreshToken) {
  await loadOauthAppFromFile();
  if (!OAUTH_APP_SECRET) throw new Error('Missing FEISHU_APP_SECRET');
  const payload = JSON.stringify({
    grant_type: 'refresh_token',
    client_id: OAUTH_APP_ID,
    client_secret: OAUTH_APP_SECRET,
    refresh_token: refreshToken,
  });
  const r = await httpsJson({
    method: 'POST',
    host: 'open.feishu.cn',
    path: '/open-apis/authen/v2/oauth/token',
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(payload) },
    body: payload,
  });
  if (r.statusCode !== 200 || !r.body) throw new Error(`token refresh failed: ${r.raw}`);
  if ((typeof r.body.code === 'number' && r.body.code !== 0) || r.body.error) {
    throw new Error(`token refresh failed: ${r.raw}`);
  }
  const tokenData = r.body.data || r.body;
  if (!tokenData || !tokenData.access_token) {
    throw new Error(`token refresh missing data: ${r.raw}`);
  }
  if (typeof tokenData.expires_in !== 'number') {
    tokenData.expires_in = 0;
  }
  return tokenData;
}

async function getValidUserToken() {
  const t = await readOauthToken();
  if (!t) return null;
  const now = Math.floor(Date.now() / 1000);
  // keep 2 min buffer
  if (t.expires_at && now < t.expires_at - 120) return t;
  if (t.refresh_token) {
    const nt = await refreshUserToken(t.refresh_token);
    const merged = {
      ...t,
      ...nt,
      // normalize to expires_at (seconds)
      expires_at: now + (nt.expires_in || 0),
    };
    await writeOauthToken(merged);
    return merged;
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
          const { message_id } = (job.inlineImages && job.inlineImages.length > 0)
            ? await sendMailHtmlWithInline(r.email, finalSubject, finalBody, job.inlineImages)
            : await sendMail(r.email, finalSubject, finalBody, { plainText: false });
          let delivery = null;
          let deliveryStatus = null;
          let deliveryStatusText = null;
          if (message_id) {
            delivery = await pollSendStatus(message_id, { timeoutMs: 60_000, intervalMs: 1200 });
            const first = Array.isArray(delivery) && delivery.length > 0 ? delivery[0] : null;
            deliveryStatus = typeof first?.status === 'number' ? first.status : null;
            deliveryStatusText = deliveryStatus !== null ? (SEND_STATUS_TEXT.get(deliveryStatus) || String(deliveryStatus)) : null;
          }

          const success = deliveryStatus === 4;
          job.results.push({
            email: r.email,
            name: r.name,
            success,
            message_id,
            deliveryStatus,
            deliveryStatusText,
            note: !message_id
              ? 'lark-cli 未返回 message_id（可能保存为草稿或解析失败）'
              : (deliveryStatusText ? `投递状态：${deliveryStatusText}` : '投递状态：未知/查询失败'),
            at: Date.now(),
          });

          if (success) job.sent += 1;
          else job.failed += 1;
          job.lastSentAt = Date.now();
        } catch (err) {
          job.results.push({ email: r.email, name: r.name, success: false, error: err.message, at: Date.now() });
          job.failed += 1;
          job.lastError = err.message;
        } finally {
          job.cursor += 1;
        }
      }

      if (job.cursor >= job.recipients.length) break;

      // Wait until next interval
      const waitMs = Math.max(0, job.intervalMinutes * 60_000);
      job.nextRunAt = Date.now() + waitMs;
      const deadline = job.nextRunAt;
      while (Date.now() < deadline) {
        if (job.status === 'cancelled') return;
        if (job.status === 'paused') { await waitUntilResumed(job); continue; }
        await sleep(Math.min(1000, deadline - Date.now()));
      }
    }

    if (job.status !== 'cancelled') job.status = 'completed';
    job.nextRunAt = null;
  } catch (err) {
    job.status = 'failed';
    job.lastError = err.message;
    job.nextRunAt = null;
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
function runLarkSend(to, subject, body, { plainText = false } = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      ...LARK_PREFIX_ARGS,
      'mail', '+send',
      '--to', to,
      '--subject', subject,
      '--body', body,
      ...(plainText ? ['--plain-text'] : []),
      '--confirm-send',
      '--as', 'user',
    ];
    execFile(LARK_BIN, args, { encoding: 'utf8' }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || stdout || err.message));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve({ message_id: parsed?.data?.message_id || parsed?.message_id || null });
      } catch {
        resolve({ message_id: null });
      }
    });
  });
}

/**
 * Send mail via official OpenAPI (avoids MIME line folding that inserts newlines into HTML).
 * API requires base64url encoding for body_html/body_plain_text.
 */
function runLarkSendViaApi(to, subject, body, { plainText = false } = {}) {
  return new Promise((resolve, reject) => {
    const data = plainText
      ? {
          subject: subject || '',
          to: [{ mail_address: to }],
          // Empirically, sending body_* as raw text avoids double-encoding in mailbox storage.
          // The Mail API docs mention base64url, but the server side appears to accept raw strings here.
          body_plain_text: String(body || ''),
        }
      : {
          subject: subject || '',
          to: [{ mail_address: to }],
          body_html: String(body || ''),
        };

    const args = [
      ...LARK_PREFIX_ARGS,
      'api',
      'POST',
      '/open-apis/mail/v1/user_mailboxes/me/messages/send',
      '--data',
      JSON.stringify(data),
      '--as',
      'user',
    ];

    execFile(LARK_BIN, args, { encoding: 'utf8' }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || stdout || err.message));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        const message_id = parsed?.data?.message_id || parsed?.message_id || null;
        resolve({ message_id });
      } catch {
        resolve({ message_id: null });
      }
    });
  });
}

function runLarkSendViaApiWithInline(to, subject, bodyHtml, inlineImages) {
  // inlineImages: [{ cid, file_path }]
  return new Promise(async (resolve, reject) => {
    try {
      const attachments = [];
      for (const img of (inlineImages || [])) {
        if (!img?.cid || !img?.file_path) continue;
        const buf = await fs.readFile(img.file_path);
        attachments.push({
          filename: path.basename(img.file_path),
          is_inline: true,
          cid: img.cid,
          body: Buffer.from(buf).toString('base64'),
        });
      }

      const data = {
        subject: subject || '',
        to: [{ mail_address: to }],
        body_html: String(bodyHtml || ''),
        ...(attachments.length ? { attachments } : {}),
      };

      const args = [
        ...LARK_PREFIX_ARGS,
        'api',
        'POST',
        '/open-apis/mail/v1/user_mailboxes/me/messages/send',
        '--data',
        JSON.stringify(data),
        '--as',
        'user',
      ];

      execFile(LARK_BIN, args, { encoding: 'utf8' }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || stdout || err.message));
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          const message_id = parsed?.data?.message_id || parsed?.message_id || null;
          resolve({ message_id });
        } catch {
          resolve({ message_id: null });
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function sendMail(to, subject, body, { plainText = false } = {}) {
  // Prefer API send (more deterministic); fall back to +send if permission is missing.
  try {
    return await runLarkSendViaApi(to, subject, body, { plainText });
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.includes('permission denied') || msg.includes('1234017') || msg.includes('mail:user_mailbox.message:send')) {
      // Missing send scope -> fallback to +send path.
      return await runLarkSend(to, subject, body, { plainText });
    }
    // Other errors should surface.
    throw err;
  }
}

async function sendMailHtmlWithInline(to, subject, bodyHtml, inlineImages) {
  // Scheme B: if we have a valid OAuth user token, send via HTTPS OpenAPI (no CLI, no command-line limits).
  const token = await getValidUserToken();
  if (token?.access_token) {
    const attachments = [];
    for (const img of (inlineImages || [])) {
      if (!img?.cid || !img?.file_path) continue;
      const buf = await fs.readFile(img.file_path);
      attachments.push({
        filename: path.basename(img.file_path),
        is_inline: true,
        cid: img.cid,
        body: Buffer.from(buf).toString('base64'),
      });
    }
    const payload = JSON.stringify({
      subject: subject || '',
      to: [{ mail_address: to }],
      body_html: String(bodyHtml || ''),
      ...(attachments.length ? { attachments } : {}),
    });
    const r = await httpsJson({
      method: 'POST',
      host: 'open.feishu.cn',
      path: '/open-apis/mail/v1/user_mailboxes/me/messages/send',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: `Bearer ${token.access_token}`,
      },
      body: payload,
    });
    if (r.statusCode !== 200 || !r.body) throw new Error(`mail send failed: ${r.raw}`);
    if (r.body.code && r.body.code !== 0) throw new Error(`mail send failed: ${r.raw}`);
    return { message_id: r.body?.data?.message_id || null };
  }

  try {
    // IMPORTANT (Windows): passing base64 attachments via `lark-cli api --data <json>`
    // can exceed CreateProcess command-line length and throw ENAMETOOLONG.
    // So for inline images we prefer `mail +send --inline` on win32.
    if (process.platform === 'win32' && Array.isArray(inlineImages) && inlineImages.length > 0) {
      throw new Error('__FORCE_CLI_INLINE__');
    }
    return await runLarkSendViaApiWithInline(to, subject, bodyHtml, inlineImages);
  } catch (err) {
    const msg = String(err?.message || '');
    if (
      msg.includes('__FORCE_CLI_INLINE__') ||
      msg.includes('permission denied') ||
      msg.includes('1234017') ||
      msg.includes('mail:user_mailbox.message:send')
    ) {
      // Fallback: use +send with --inline (supported by CLI)
      const inlineArg = JSON.stringify(
        (inlineImages || [])
          .filter(x => x?.cid && x?.file_path)
          .map(x => {
            // lark-cli enforces attachment paths to be relative to cwd for safety.
            // We store uploads under `mail-tool/uploads`, so set cwd=__dirname and pass ./uploads/...
            let rel = path.relative(__dirname, x.file_path);
            rel = rel.replace(/\\/g, '/');
            if (!rel.startsWith('.')) rel = `./${rel}`;
            return ({ cid: x.cid, file_path: rel });
          })
      );
      // runLarkSend doesn't support inline; call CLI directly here
      return new Promise((resolve, reject) => {
        const args = [
          ...LARK_PREFIX_ARGS,
          'mail', '+send',
          '--to', to,
          '--subject', subject,
          '--body', bodyHtml,
          '--inline', inlineArg,
          '--confirm-send',
          '--as', 'user',
        ];
        execFile(LARK_BIN, args, { encoding: 'utf8', cwd: __dirname }, (e2, stdout, stderr) => {
          if (e2) { reject(new Error(stderr || stdout || e2.message)); return; }
          try {
            const parsed = JSON.parse(stdout);
            resolve({ message_id: parsed?.data?.message_id || parsed?.message_id || null });
          } catch {
            resolve({ message_id: null });
          }
        });
      });
    }
    throw err;
  }
}

/**
 * Polls send_status for a given message_id. Returns status code (int) or null.
 */
function runSendStatus(messageId) {
  return new Promise((resolve) => {
    const args = [
      ...LARK_PREFIX_ARGS,
      'mail', 'user_mailbox.messages', 'send_status',
      '--params', JSON.stringify({ user_mailbox_id: 'me', message_id: messageId }),
      '--as', 'user',
    ];
    execFile(LARK_BIN, args, { encoding: 'utf8' }, (err, stdout) => {
      if (err) { resolve(null); return; }
      try {
        const parsed = JSON.parse(stdout);
        const details = parsed?.data?.details;
        if (Array.isArray(details) && details.length > 0) {
          resolve(details);
        } else {
          resolve([]);
        }
      } catch {
        resolve(null);
      }
    });
  });
}

const SEND_STATUS_TEXT = new Map([
  [1, '正在投递'],
  [2, '投递失败重试'],
  [3, '投递失败退信'],
  [4, '投递成功'],
  [5, '待审批'],
  [6, '审批拒绝'],
  [0, '未知'],
]);

function isTerminalSendStatus(code) {
  return code === 3 || code === 4 || code === 6;
}

async function pollSendStatus(messageId, { timeoutMs = 60_000, intervalMs = 1200 } = {}) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    const details = await runSendStatus(messageId);
    if (details === null) {
      last = null;
    } else {
      last = details;
      const codes = details
        .map(d => (typeof d?.status === 'number' ? d.status : null))
        .filter(c => c !== null);
      // If any recipient is terminal, we can stop early. (Single-recipient send -> that's enough.)
      if (codes.some(isTerminalSendStatus)) break;
      // Approval pending can be long; still stop early to avoid lying about "success".
      if (codes.some(c => c === 5)) break;
    }
    await sleep(intervalMs);
  }
  return last;
}

function isAcceptedSendStatus(code) {
  // "accepted / in-progress / pending approval / retry" should not be shown as "send failed"
  return code === 1 || code === 2 || code === 4 || code === 5;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  try {
    // Base URL is only used for parsing pathname/query.
    const url = new URL(req.url, 'http://localhost');

    // GET /oauth/start — print authorize URL
    if (req.method === 'GET' && url.pathname === '/oauth/start') {
      if (!serverBaseUrl) serverBaseUrl = `http://127.0.0.1:${BASE_PORT}`;
      const redirectUri = `${serverBaseUrl}/oauth/callback`;
      const state = crypto.randomBytes(12).toString('hex');
      const authUrl = new URL('https://accounts.feishu.cn/open-apis/authen/v1/authorize');
      authUrl.searchParams.set('app_id', OAUTH_APP_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('response_type', 'code');
      // mail send needs user token + offline_access for refresh
      authUrl.searchParams.set('scope', 'mail:user_mailbox.message:send offline_access');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Open this URL to authorize, then you'll be redirected back:\n\n${authUrl.toString()}\n`);
      return;
    }

    // GET /oauth/callback?code=...&state=...
    if (req.method === 'GET' && url.pathname === '/oauth/callback') {
      const code = url.searchParams.get('code');
      if (!code) { res.writeHead(400); res.end('missing code'); return; }
      const redirectUri = `${serverBaseUrl || `http://127.0.0.1:${BASE_PORT}`}/oauth/callback`;
      try {
        // If token already exists, don't re-exchange.
        const existing = await readOauthToken();
        if (existing?.access_token) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h2>已授权</h2><p>已检测到本机 token（无需重复授权）。回到邮件工具继续发送即可。</p>`);
          return;
        }

        // Authorization codes are single-use. Avoid accidental double-exchange (refresh / prefetch).
        if (usedAuthCodes.has(code)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h2>授权已处理</h2><p>该 code 已经使用过。请回到邮件工具继续发送；若仍未生效，请重新从 <code>/oauth/start</code> 发起授权。</p>`);
          return;
        }
        if (oauthExchanging) {
          res.writeHead(429, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('正在处理授权，请稍后刷新一次（不要重复打开多个回调标签页）');
          return;
        }
        oauthExchanging = true;
        usedAuthCodes.add(code);

        const data = await exchangeCodeForToken(code, redirectUri);
        const now = Math.floor(Date.now() / 1000);
        const token = {
          ...data,
          expires_at: now + (data.expires_in || 0),
          obtained_at: now,
        };
        await writeOauthToken(token);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h2>授权成功</h2><p>你可以回到邮件工具继续发送（带内联图片将走 OpenAPI 直连）。</p>`);
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
        from: 'liuyikai@fluxvita.com',
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
            : (inlineImages && inlineImages.length > 0)
              ? await sendMailHtmlWithInline(r.email, finalSubject, finalBody, inlineImages)
              : await sendMail(r.email, finalSubject, finalBody, { plainText: false });
          let delivery = null;
          let deliveryStatus = null;
          let deliveryStatusText = null;
          if (message_id) {
            delivery = await pollSendStatus(message_id, { timeoutMs: 60_000, intervalMs: 1200 });
            const first = Array.isArray(delivery) && delivery.length > 0 ? delivery[0] : null;
            deliveryStatus = typeof first?.status === 'number' ? first.status : null;
            deliveryStatusText = deliveryStatus !== null ? (SEND_STATUS_TEXT.get(deliveryStatus) || String(deliveryStatus)) : null;
          }

          const accepted = !!message_id && (deliveryStatus === null || isAcceptedSendStatus(deliveryStatus));
          const delivered = deliveryStatus === 4;
          const note = !message_id
            ? 'lark-cli 未返回 message_id（可能保存为草稿或解析失败）'
            : (deliveryStatusText ? `投递状态：${deliveryStatusText}` : '投递状态：未知/查询失败');

          results.push({
            email: r.email,
            name: r.name,
            success: accepted,
            delivered,
            message_id,
            deliveryStatus,
            deliveryStatusText,
            note,
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

listenWithFallback(server, BASE_PORT);
