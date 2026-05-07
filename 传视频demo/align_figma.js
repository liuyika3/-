import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Chat input styling to match Figma: bg-white, radius-32, border-white
content = content.replace(/className=\{\`chat-input \$\{isLifestyleCoach \? '!bg-\[#F2F2F2\] !border-black\/5' : ''\}\`\}/, 'className={`chat-input ${isLifestyleCoach ? \'!bg-white !border-white !rounded-[32px] shadow-[0_4px_24px_rgba(0,0,0,0.04)]\' : \'\'}`}');

// 2. CTA buttons: change from gradient to solid black, rounded-[32px]
content = content.replace(/bg-gradient-to-b from-black to-\[\#575757\]/g, 'bg-black');
content = content.replace(/rounded-\[100px\]/g, 'rounded-[32px]');

// 3. Card outer border: border-white/50 -> border-white
content = content.replace(/border-white\/50 shadow-\[0_4px_8px_rgba\(0,0,0,0\.05\)\]/g, 'border-white shadow-[0_8px_24px_rgba(0,0,0,0.04)]');

// 4. Sub-cards in SLEEP (todos): bg-white/50 -> bg-white
content = content.replace(/bg-white\/50 rounded-\[16px\] p-3 border border-white\/50/g, 'bg-white rounded-[16px] p-3 border border-white shadow-[0_4px_12px_rgba(0,0,0,0.03)]');

// 5. In HEALTH, change CTA from blue gradient to solid black
content = content.replace(/bg-gradient-to-b from-\[\#1A9CFF\] to-\[\#92D7FF\]/g, 'bg-black');
content = content.replace(/shadow-\[0_8px_16px_rgba\(26,156,255,0\.3\)\]/g, 'shadow-[0_8px_16px_rgba(0,0,0,0.2)]');
content = content.replace(/<span className="text-white text-\[16px\] font-\[590\]">开启「健康外食」监督<\/span>/g, '<span className="text-[#ACFF4E] text-[16px] font-[590]">开启「健康外食」监督</span>');

fs.writeFileSync('src/App.tsx', content);
