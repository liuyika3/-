import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update card titles to match Figma
content = content.replace(/text-\[22px\] font-\[600\]/g, 'text-[20px] font-[590]');

// Update the CTA in sleep
content = content.replace(/bg-black flex items-center/g, 'bg-black flex items-center');

fs.writeFileSync('src/App.tsx', content);
