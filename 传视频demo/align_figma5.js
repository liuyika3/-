import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update send-btn
content = content.replace(
  /<button className=\{\`send-btn \$\{isLifestyleCoach \? '!bg-black !text-white' : ''\}\`\}/,
  '<button className={`send-btn ${isLifestyleCoach ? \'!bg-[#ACFF4E] !text-black !w-[36px] !h-[36px] flex items-center justify-center !rounded-full shadow-[0_4px_12px_rgba(172,255,78,0.3)]\' : \'\'}`}'
);

// Update CTA button for SLEEP to be solid black with #ACFF4E text
content = content.replace(
  /<span className="text-white text-\[16px\] font-\[590\]">锁定并追踪睡眠记录<\/span>/,
  '<span className="text-[#ACFF4E] text-[16px] font-[590]">锁定并追踪睡眠记录</span>'
);

// Update CTA button for MORNING to be solid black with #ACFF4E text
content = content.replace(
  /<span className="text-white text-\[16px\] font-\[590\]">应用此 Routine<\/span>/,
  '<span className="text-[#ACFF4E] text-[16px] font-[590]">应用此 Routine</span>'
);

fs.writeFileSync('src/App.tsx', content);
