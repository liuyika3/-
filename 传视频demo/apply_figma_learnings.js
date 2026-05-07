import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /I'm Jovida, your AI health coach\. You can think of me as your health /,
  "I'm Jovida, your AI health coach. You can think of me as your health"
);

fs.writeFileSync('src/App.tsx', content);
