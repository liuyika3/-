const fs = require('fs');
const data = JSON.parse(fs.readFileSync('figma_response.json', 'utf8'));

const canvas = data.nodes['9882:17474'].document;

function searchFigma(node, query, path="") {
    if (node.type === 'TEXT' && node.characters && node.characters.includes(query)) {
        console.log('Found "' + query + '" in node ' + node.id + ' (' + node.name + ') at ' + path);
    }
    if (node.children) {
        for (let child of node.children) {
            searchFigma(child, query, path + '/' + child.name);
        }
    }
}

searchFigma(canvas, 'Matthew');
searchFigma(canvas, 'Mia');
searchFigma(canvas, '外食');
searchFigma(canvas, '睡眠');
searchFigma(canvas, 'skin');
searchFigma(canvas, '显化');
