import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The restaurant list in HEALTH currently maps over items
content = content.replace(
  /\{r\.items\.map\(\(item, j\) => \(\n\s*<div key=\{j\} className="text-\[14px\] font-\[590\] text-black flex items-center justify-between">\n\s*<span>\{item.split\(' '\)\[0\]\}<\/span>\n\s*<span className="text-\[12px\] text-black\/40 font-\[400\]">\{item.split\(' '\)\[1\]\}<\/span>\n\s*<\/div>\n\s*\)\)}/,
  `{r.items.map((item, j) => {
                      const match = item.match(/(.*?)\\((.*?)\\)/);
                      const name = match ? match[1].trim() : item;
                      const cals = match ? match[2] : '';
                      return (
                        <div key={j} className="text-[14px] font-[590] text-black flex items-center justify-between mb-1">
                          <span>{name}</span>
                          {cals && <span className="bg-black text-[#FFA61A] text-[12px] font-[600] px-2 py-0.5 rounded-[8px]">{cals}</span>}
                        </div>
                      );
                    })}`
);

fs.writeFileSync('src/App.tsx', content);
