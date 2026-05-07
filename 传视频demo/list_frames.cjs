const fs = require('fs');
const data = JSON.parse(fs.readFileSync('figma_response.json', 'utf8'));

const canvas = data.nodes['9882:17474'].document;

let output = 'Top level frames in CANVAS:\\n';

for (let child of canvas.children) {
    output += child.type + ' ' + child.name + ' (id: ' + child.id + ')\\n';
}

fs.writeFileSync('top_frames.txt', output);
