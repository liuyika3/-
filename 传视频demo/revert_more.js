import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The main card backgrounds should be #F2F2F2, inner borders should be white/50.
content = content.replace(/!bg-white !border-white\/50 !rounded-\[32px\] shadow-\[0_4px_24px_rgba\(0,0,0,0\.04\)\]/g, '!bg-[#F2F2F2] !border-white/50 !rounded-[24px] shadow-[0_4px_8px_rgba(0,0,0,0.05)]');

// The checkboxes in MORNING
content = content.replace(/bg-\[\#ACFF4E\] border-black/g, 'bg-gradient-to-b from-black to-[#575757] border-transparent');
content = content.replace(/text-black/g, 'text-black'); // wait, that's broad

fs.writeFileSync('src/App.tsx', content);
