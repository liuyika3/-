const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Rewrite handlePasteOrInput to set the correct case based on keywords
const newHandler = `const handlePasteOrInput = (e: React.ChangeEvent<HTMLInputElement> | React.ClipboardEvent<HTMLInputElement>) => {
    const val = (e.target as HTMLInputElement).value.toLowerCase();
    if (val.trim() !== '') {
      if (val.includes('sleep') || val.includes('睡眠')) {
        setCoach('SLEEP');
      } else if (val.includes('morning') || val.includes('routine') || val.includes('晨间')) {
        setCoach('MORNING');
      } else if (val.includes('health') || val.includes('wagas') || val.includes('健康') || val.includes('外食')) {
        setCoach('HEALTH');
      } else {
        // Fallback to HEALTH if unrecognized
        setCoach('HEALTH');
      }
      setTimeout(() => setCurrentPage('CHAT'), 300);
    }
  };`;

code = code.replace(/const handlePasteOrInput = [\s\S]*?setTimeout\(\(\) => setCurrentPage\('CHAT'\), 300\);\n    }\n  };/, newHandler);

// 2. Reduce font sizes globally to make it "overall a bit smaller"
code = code.replace(/(!?text-\[)(\d+)(px\])/g, (match, p1, p2, p3) => {
    let size = parseInt(p2);
    let newSize = size;
    
    // Scale down the sizes
    if (size >= 28) newSize = size - 4;      // e.g. 28 -> 24
    else if (size >= 20) newSize = size - 3; // e.g. 22->19, 20->17
    else if (size >= 16) newSize = size - 2; // e.g. 18->16, 17->15, 16->14
    else if (size >= 14) newSize = size - 2; // e.g. 15->13, 14->12
    else if (size > 10) newSize = size - 1;  // e.g. 12->11

    return p1 + newSize + p3;
});

// Also reduce the coach message font size which is defined in index.css or via !text-[17px] which is handled above.
// Let's also check hardcoded inline styles if any, but Tailwind is used mainly.

fs.writeFileSync('src/App.tsx', code);
console.log("App.tsx modified: Input routing added and font sizes reduced.");
