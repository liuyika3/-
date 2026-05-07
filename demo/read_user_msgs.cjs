const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\2025lyk\\.cursor\\projects\\c-Users-2025lyk-Desktop-dmoes-api-demos\\agent-transcripts\\5d8f5f49-2790-4f00-a030-2cbb7f5d4270.txt', 'utf8');

const lines = content.split('\n');
const userMessages = lines.filter((l, i) => l.startsWith('user:'));
console.log("Last user messages in transcript:");
for (let i = Math.max(0, userMessages.length - 10); i < userMessages.length; i++) {
    // Find the actual message text by getting the next few lines after 'user:'
    const userLineIdx = lines.indexOf(userMessages[i]);
    const textLines = [];
    for (let j = userLineIdx + 1; j < Math.min(userLineIdx + 10, lines.length); j++) {
        if (lines[j].startsWith('assistant:') || lines[j].startsWith('user:')) break;
        if (lines[j].trim() !== '' && !lines[j].includes('<attached_files>')) {
            textLines.push(lines[j]);
        }
    }
    console.log(`-- Message ${i+1} --\n${textLines.join('\n')}\n`);
}
