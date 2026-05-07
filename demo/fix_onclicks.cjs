const fs = require('fs');

const files = ['fitness.html', 'sugar.html', 'english.html', 'jobs.html', 'travel.html'];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Fix double quotes in onclick
  content = content.replace(/onclick="obSelect\(([^)]*?)\)"/g, (match, args) => {
      return `onclick="obSelect(${args.replace(/"/g, "'")})"`;
  });
  content = content.replace(/onclick="enObSelect\(([^)]*?)\)"/g, (match, args) => {
      return `onclick="enObSelect(${args.replace(/"/g, "'")})"`;
  });
  content = content.replace(/onclick="caObSelect\(([^)]*?)\)"/g, (match, args) => {
      return `onclick="caObSelect(${args.replace(/"/g, "'")})"`;
  });
  content = content.replace(/onclick="trObSelect\(([^)]*?)\)"/g, (match, args) => {
      return `onclick="trObSelect(${args.replace(/"/g, "'")})"`;
  });
  content = content.replace(/onclick="sgObSelect\(([^)]*?)\)"/g, (match, args) => {
      return `onclick="sgObSelect(${args.replace(/"/g, "'")})"`;
  });
  
  // Clean up the 3rd argument to avoid raw HTML causing issues, extracting just the text content
  content = content.replace(/obSelect\((\d+),\s*'([^']+)',\s*'([^']+)',\s*event\)/g, (match, p1, p2, p3) => {
      const cleanLabel = p3.replace(/<[^>]+>/g, '').trim();
      return `obSelect(${p1}, '${p2}', '${cleanLabel}', event)`;
  });
  content = content.replace(/sgObSelect\((\d+),\s*'([^']+)',\s*'([^']+)',\s*event\)/g, (match, p1, p2, p3) => {
      const cleanLabel = p3.replace(/<[^>]+>/g, '').trim();
      return `sgObSelect(${p1}, '${p2}', '${cleanLabel}', event)`;
  });
  content = content.replace(/enObSelect\((\d+),\s*'([^']+)',\s*'([^']+)',\s*event\)/g, (match, p1, p2, p3) => {
      const cleanLabel = p3.replace(/<[^>]+>/g, '').trim();
      return `enObSelect(${p1}, '${p2}', '${cleanLabel}', event)`;
  });
  content = content.replace(/caObSelect\((\d+),\s*'([^']+)',\s*'([^']+)',\s*event\)/g, (match, p1, p2, p3) => {
      const cleanLabel = p3.replace(/<[^>]+>/g, '').trim();
      return `caObSelect(${p1}, '${p2}', '${cleanLabel}', event)`;
  });
  content = content.replace(/trObSelect\((\d+),\s*'([^']+)',\s*'([^']+)',\s*event\)/g, (match, p1, p2, p3) => {
      const cleanLabel = p3.replace(/<[^>]+>/g, '').trim();
      return `trObSelect(${p1}, '${p2}', '${cleanLabel}', event)`;
  });

  // Add lucide.createIcons();
  if (content.includes('el.style.display = \'block\';') || content.includes('el.style.display="block";') || content.includes('el.classList.add(\'show\');')) {
      content = content.replace(/(el\.style\.display\s*=\s*['"]block['"];)/, "$1\n  if (window.lucide) lucide.createIcons();");
      content = content.replace(/(el\.classList\.add\(['"]show['"]\);)/, "$1\n  if (window.lucide) lucide.createIcons();");
  }

  fs.writeFileSync(file, content);
  console.log(`Fixed ${file}`);
}
