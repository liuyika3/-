const { execSync } = require('child_process');

try {
    const rawData = execSync('lark-cli.cmd docs +fetch --doc "https://hcnjo5oqfjlb.feishu.cn/wiki/OI8swa8AginzjPkXHxfc9tLsnEP" --as user', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const data = JSON.parse(rawData);
    const fullMd = data.data.markdown;

    const titleStr = '## v0.13 需求讨论';
    const nextTitleStr = '## v0.14';

    const startIdx = fullMd.indexOf(titleStr);
    let sectionContent = fullMd.substring(startIdx);
    if (fullMd.indexOf(nextTitleStr) !== -1) {
        sectionContent = fullMd.substring(startIdx, fullMd.indexOf(nextTitleStr));
    }
    
    console.log(sectionContent);
} catch (e) {
    console.error('Error:', e.message);
}
