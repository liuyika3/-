const fs = require('fs');
let c = fs.readFileSync('src/index.css', 'utf8');

c = c.replace(/font-family: inherit;/g, 'font-family: inherit;'); 
// Wait, CSS `font-family` doesn't inherit to form elements natively in some browsers.
// Let's explicitly target buttons, inputs, etc.

let extra = `
button, input, textarea, select {
  font-family: inherit;
}
`;

if (!c.includes('button, input')) {
    c += extra;
}

fs.writeFileSync('src/index.css', c);
