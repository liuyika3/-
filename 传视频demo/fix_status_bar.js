import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/className=\{\`status-bar \$\{isLifestyleCoach \? 'text-black \\\[&_svg\\\]:fill-black' : 'text-white \\\[&_svg\\\]:fill-white'\}\`\}/, 'className={`status-bar ${isLifestyleCoach ? \'!text-black [&_svg]:!fill-black\' : \'text-white [&_svg]:fill-white\'}`}');

fs.writeFileSync('src/App.tsx', content);
