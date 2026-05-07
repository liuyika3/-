import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/className="absolute inset-0 bg-\[\#E7E9EC\] z-\[1000\] flex flex-col text-black animation-slide-in"/, 'className="absolute inset-0 bg-[#E7E9EC] z-[1000] flex flex-col text-black" style={{ animation: \'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)\' }}');

fs.writeFileSync('src/App.tsx', content);
