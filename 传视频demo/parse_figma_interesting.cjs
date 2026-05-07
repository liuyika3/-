const fs = require('fs');
const data = JSON.parse(fs.readFileSync('figma_response.json', 'utf8'));

const node = data.nodes['9882:17474'].document;

function extractInteresting(node, depth=0) {
    let result = '';
    const indent = '  '.repeat(depth);
    if (node.name) {
        result += `${indent}${node.type} ${node.name}\n`;
    }
    if (node.type === 'TEXT') {
        result += `${indent}TEXT: "${node.characters}"\n`;
    }
    if (node.backgroundColor || node.fills) {
        // summarize colors
    }
    
    if (node.children) {
        for (let child of node.children) {
            result += extractInteresting(child, depth + 1);
        }
    }
    return result;
}

const summary = extractInteresting(node);
fs.writeFileSync('figma_interesting.txt', summary);
