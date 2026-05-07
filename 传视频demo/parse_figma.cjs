const fs = require('fs');
const data = JSON.parse(fs.readFileSync('figma_response.json', 'utf8'));

const node = data.nodes['9882:17474'].document;

function extractTextAndStyles(node, depth=0) {
    let result = '';
    const indent = '  '.repeat(depth);
    if (node.name) {
        result += `${indent}Node: ${node.name} (type: ${node.type})\n`;
    }
    if (node.type === 'TEXT') {
        result += `${indent}Text: "${node.characters}"\n`;
        if (node.style) {
             result += `${indent}Font: ${node.style.fontFamily} ${node.style.fontWeight}, Size: ${node.style.fontSize}, Fills: ${JSON.stringify(node.fills)}\n`;
        }
    }
    if (node.fills && node.type !== 'TEXT') {
         result += `${indent}Fills: ${JSON.stringify(node.fills.filter(f => f.type === 'SOLID').map(f => f.color))}\n`;
    }
    if (node.cornerRadius) {
        result += `${indent}Radius: ${node.cornerRadius}\n`;
    }
    
    if (node.children) {
        for (let child of node.children) {
            result += extractTextAndStyles(child, depth + 1);
        }
    }
    return result;
}

const summary = extractTextAndStyles(node);
fs.writeFileSync('figma_summary.txt', summary);
