const fs = require('fs');
let c = fs.readFileSync('src/index.css', 'utf8');

c = c.replace(/@import url[^;]+;/, "@import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700;800;900&family=Noto+Sans+SC:wght@400;500;600;700;800;900&display=swap');");
c = c.replace(/font-family: 'SF Pro Display'.*?;/, "font-family: 'SF Pro Display', 'SF Pro Text', 'Noto Sans SC', -apple-system, sans-serif;\n  font-variation-settings: 'wdth' 100;");

fs.writeFileSync('src/index.css', c);
