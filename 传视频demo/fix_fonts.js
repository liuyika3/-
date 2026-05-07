import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// There might be elements lacking CJK fonts or not picking up the right fonts due to overriding.
// The user says "字体这么怪" (fonts are so weird). This often happens when default font family is overridden by tailwind or some global class.
// But we set body font-family. Wait, we use `font-['Urbanist']` in some places, which is fine for numbers.
// Is tailwind overriding font-family?
// We imported Noto Sans SC in index.html and index.css.
content = content.replace(/font-\['Urbanist'\]/g, 'font-["Urbanist",sans-serif]');

fs.writeFileSync('src/App.tsx', content);
