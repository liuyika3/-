import fs from 'fs';
let content = fs.readFileSync('src/index.css', 'utf8');

content = content.replace(/@import "tailwindcss";\n@import url\('https:\/\/fonts.googleapis.com\/css2\?family=Urbanist:wght@400;500;600;700;800&display=swap'\);/, '@import url(\'https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700;800&display=swap\');\n@import "tailwindcss";');

fs.writeFileSync('src/index.css', content);
