import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix global app styling dynamically when 3 cases are active using !important in tailwind
content = content.replace(/className=\{\`phone \$\{isLifestyleCoach \? 'bg-\[\#E7E9EC\] text-black border-white shadow-\[0_20px_40px_rgba\(0,0,0,0\.1\)\]' : ''\}\`\}/, 'className={`phone ${isLifestyleCoach ? \'!bg-[#E7E9EC] !text-black !border-white !shadow-[0_20px_40px_rgba(0,0,0,0.1)]\' : \'\'}`}');

fs.writeFileSync('src/App.tsx', content);
