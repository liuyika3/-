import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update Checkbox in MORNING
content = content.replace(
  /bg-black border-transparent/g,
  'bg-[#ACFF4E] border-black border-[2px]'
);
content = content.replace(
  /text-\[\#ACFF4E\]/g,
  'text-black'
);
// Wait, I replaced text-[#ACFF4E] globally which might break the CTA buttons!
