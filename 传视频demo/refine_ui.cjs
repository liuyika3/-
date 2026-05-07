const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Change card borders from border-white/50 to border-white to match Figma
code = code.replace(/border-white\/50 shadow-\[0_4px_8px_rgba\(0,0,0,0\.05\)\]/g, 'border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)]');

// 2. Change sub-cards from bg-white/50 to bg-white
code = code.replace(/bg-white\/50 rounded-\[16px\]/g, 'bg-white rounded-[16px]');
code = code.replace(/bg-white\/50 rounded-\[12px\]/g, 'bg-white rounded-[12px]');

// 3. Check MORNING checklist completed state
code = code.replace(/bg-\[#ACFF4E\] border-black/g, 'bg-[#ACFF4E] border-[#ACFF4E]');

// 4. Ensure Health sub-cards are bg-white
code = code.replace(/className="bg-white\/50/g, 'className="bg-white');

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx updated');
