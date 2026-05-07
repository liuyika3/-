import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /!text-black !text-\[16px\] leading-\[1\.4\] w-full/,
  '!text-black !text-[17px] leading-[1.4] w-fit shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
);

fs.writeFileSync('src/App.tsx', content);
