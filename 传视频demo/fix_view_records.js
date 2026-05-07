import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/<div className="view-records">/g, '<div className={`view-records ${isLifestyleCoach ? \'!text-black/40\' : \'\'}`}>');

fs.writeFileSync('src/App.tsx', content);
