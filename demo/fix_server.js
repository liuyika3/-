const fs = require('fs');

let content = fs.readFileSync('server.cjs', 'utf8');

// The issue is that express.static(__dirname) serves index.html by default
// if someone requests '/'
// So I will just tell the user to visit /launcher.html OR I will rename launcher.html to index.html and the old index.html to tools.html

// Wait, the user specifically mentioned "我们在左边的侧边栏，有所有的api，5个showcase..."
// Let me look at launcher.html to see what it links to.
