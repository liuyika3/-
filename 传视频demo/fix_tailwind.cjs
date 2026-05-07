const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');
c = c.replace(/font-\[\"Urbanist\",sans-serif\]/g, "font-['Urbanist',sans-serif]");
fs.writeFileSync('src/App.tsx', c);