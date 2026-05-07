const fs = require('fs');
let index = fs.readFileSync('index.html', 'utf8');
index = index.replace(/data-src="index.html\?embed=1&page=/g, 'data-src="tools.html?embed=1&page=');
fs.writeFileSync('index.html', index);
