import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update coach-msg for lifestyle to look like Figma chat bubble
content = content.replace(
  /<div className="coach-msg">/,
  '<div className={`coach-msg ${isLifestyleCoach ? \'!px-4 !py-4\' : \'\'}`}>'
);

content = content.replace(
  /<div className=\{\`coach-avatar \$\{isLifestyleCoach \? 'coach-avatar-brand' : ''\}\`\}>/,
  '<div className={`coach-avatar ${isLifestyleCoach ? \'hidden\' : \'\'}`}>'
);

content = content.replace(
  /<div className=\{\`coach-text \$\{isLifestyleCoach \? '!text-black' : ''\}\`\}>/,
  '<div className={`coach-text ${isLifestyleCoach ? \'!bg-[#F2F2F2] !rounded-[24px] !p-[12px_16px] !text-black !text-[16px] leading-[1.4] w-full\' : \'\'}`}>'
);

fs.writeFileSync('src/App.tsx', content);
