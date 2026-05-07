const { execSync, execFileSync } = require('child_process');
const fs = require('fs');

const DOC_URL = 'https://hcnjo5oqfjlb.feishu.cn/wiki/FoiHwoDrJix1Wzkgf8EcQhGznZf?from=from_copylink';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

const fetched = run(`lark-cli docs +fetch --doc "${DOC_URL}" --as user --limit 30000`);
const json = JSON.parse(fetched);
let md = json?.data?.markdown || '';

const replacement = fs.readFileSync('investor_tools_replace.md', 'utf8').trim();

const startMarker = '### 一、投资人向（偏“范式级故事”）';
const endMarker = '### 二、网络推广向（偏“短视频爆点”）';

const start = md.indexOf(startMarker);
const end = md.indexOf(endMarker);

if (start === -1 || end === -1 || end <= start) {
  throw new Error('Cannot locate investor section markers in current doc content.');
}

const newMd = md.slice(0, start) + replacement + '\n\n' + md.slice(end);
const out = execFileSync(
  'lark-cli.cmd',
  ['docs', '+update', '--doc', DOC_URL, '--as', 'user', '--mode', 'overwrite', '--markdown', newMd],
  { encoding: 'utf8' }
);
if (out) process.stdout.write(out);
console.log('Investor section updated successfully.');
