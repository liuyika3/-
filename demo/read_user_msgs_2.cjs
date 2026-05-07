const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\2025lyk\\.cursor\\projects\\c-Users-2025lyk-Desktop-dmoes-api-demos\\agent-transcripts\\5d8f5f49-2790-4f00-a030-2cbb7f5d4270.txt', 'utf8');

// The file format might be a bit different, let's just do a rough text search
const blocks = content.split('\n\nuser:\n');
console.log("Last 5 User prompts from previous session:");
for (let i = Math.max(0, blocks.length - 5); i < blocks.length; i++) {
    const text = blocks[i].substring(0, 500); // just show start
    if (!text.includes('<code_selection')) {
       console.log(`-- Block ${i} --\n${text}\n`);
    }
}
