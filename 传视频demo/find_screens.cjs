const fs = require('fs');
const data = JSON.parse(fs.readFileSync('figma_response.json', 'utf8'));
const canvas = data.nodes['9882:17474'].document;

let output = '';
for (let child of canvas.children) {
    if (child.type === 'FRAME' && child.absoluteBoundingBox) {
        const {width, height} = child.absoluteBoundingBox;
        if (width >= 360 && width <= 430 && height >= 700) {
            output += 'Mobile Screen: ' + child.name + ' (id: ' + child.id + ')\\n';
        }
    }
}
fs.writeFileSync('screens.txt', output);
