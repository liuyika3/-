const fs = require('fs');
const data = JSON.parse(fs.readFileSync('figma_response.json', 'utf8'));

const canvas = data.nodes['9882:17474'].document;

function findNodeById(node, id) {
    if (node.id === id) return node;
    if (node.children) {
        for (let child of node.children) {
            let res = findNodeById(child, id);
            if (res) return res;
        }
    }
    return null;
}

function extractDetails(node, depth=0) {
    let result = '';
    const indent = '  '.repeat(depth);
    if (!node) return result;
    
    result += indent + node.type + ' ' + node.name + '\\n';
    if (node.type === 'TEXT') {
        result += indent + ' TEXT: "' + node.characters.replace(/\\n/g, '\\n' + indent + '       ') + '"\\n';
        if (node.style) {
             result += indent + ' FONT: ' + node.style.fontFamily + ' ' + node.style.fontWeight + ', Size: ' + node.style.fontSize + '\\n';
        }
        if (node.fills && node.fills.length) {
             const f = node.fills[0];
             if (f.color) result += indent + ' COLOR: rgba(' + f.color.r + ',' + f.color.g + ',' + f.color.b + ',' + f.color.a + ')\\n';
        }
    }
    if (node.fills && node.type !== 'TEXT') {
         const solidFills = node.fills.filter(f => f.type === 'SOLID');
         if (solidFills.length) {
             result += indent + ' BG: rgba(' + solidFills[0].color.r + ',' + solidFills[0].color.g + ',' + solidFills[0].color.b + ',' + solidFills[0].color.a + ')\\n';
         }
    }
    if (node.strokes && node.strokes.length) {
         const solidStrokes = node.strokes.filter(f => f.type === 'SOLID');
         if (solidStrokes.length) {
             result += indent + ' BORDER: rgba(' + solidStrokes[0].color.r + ',' + solidStrokes[0].color.g + ',' + solidStrokes[0].color.b + ',' + solidStrokes[0].color.a + ') width ' + node.strokeWeight + '\\n';
         }
    }
    if (node.cornerRadius) {
        result += indent + ' RADIUS: ' + node.cornerRadius + '\\n';
    }
    
    if (node.children) {
        for (let child of node.children) {
            result += extractDetails(child, depth + 1);
        }
    }
    return result;
}

let out = '';
out += '=== 1784 (10978:16813) ===\\n';
out += extractDetails(findNodeById(canvas, '10978:16813'));
out += '=== 1786 (10982:17437) ===\\n';
out += extractDetails(findNodeById(canvas, '10982:17437'));

fs.writeFileSync('figma_details_3.txt', out);
