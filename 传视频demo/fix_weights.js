import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// The design skill specifies SF Pro font weights: 400 (Regular), 510 (Medium), 590 (Semibold), 700 (Bold), 800 (ExtraBold).
// Tailwind doesn't have 590 by default, so font-[590] translates to exactly 590.
// Let's replace 'font-[590]' with 'font-semibold' or 'font-[600]' because browsers typically map 590 to 600 or there might be an issue with 590 rendering in standard fonts if SF Pro isn't exactly installed with that weight mapping.
// Actually, standard web fonts (like Noto Sans SC or Inter) only have 400, 500, 600, 700, 800, 900.
// Using `font-[590]` on a font that only has 500 and 600 might cause the browser to fallback to 500 or synthesize a weird weight.
// Let's change `font-[590]` to `font-[600]` and `font-[510]` to `font-[500]` for better compatibility.

content = content.replace(/font-\[590\]/g, 'font-[600]');
content = content.replace(/font-\[510\]/g, 'font-[500]');

fs.writeFileSync('src/App.tsx', content);
