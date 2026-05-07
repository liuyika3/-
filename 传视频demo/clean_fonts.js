import fs from 'fs';
let content = fs.readFileSync('src/index.css', 'utf8');

content = content.replace(/font-family: 'SF Pro Display', 'SF Pro Text', 'Noto Sans SC', -apple-system, sans-serif;/g, 'font-family: inherit;');
// Let's remove the redundant font-families to rely on body's font-family
// Wait, actually `font-family: -apple-system...` in body is good. We just need to make sure buttons and inputs inherit it, or remove the other declarations.

fs.writeFileSync('src/index_clean.css', content);
