const fs = require('fs');
const indexPath = 'c:/Users/canc9/OneDrive/Desktop/Pro-66/server/node_modules/.prisma/client/index.js';
let content = fs.readFileSync(indexPath, 'utf8');

const modelMarker = 'config.runtimeDataModel = JSON.parse("';
const modelStartIndex = content.indexOf(modelMarker);
if (modelStartIndex !== -1) {
    const stringStart = modelStartIndex + modelMarker.length;
    const stringEnd = content.indexOf('")', stringStart);
    let jsonString = content.substring(stringStart, stringEnd);
    
    // Check for the missing comma between the closing brace and the next opening brace
    // Specifically searching for the break I likely introduced.
    const pattern = /"isUpdatedAt":false}{\"name\":\"status\"/;
    if (pattern.test(jsonString)) {
        console.log('Found the missing comma error!');
        jsonString = jsonString.replace('"isUpdatedAt":false}{\"name\":\"status\"', '"isUpdatedAt":false},{\\"name\\":\\"status\\"');
        
        const newContent = content.substring(0, stringStart) + jsonString + content.substring(stringEnd);
        fs.writeFileSync(indexPath, newContent);
        console.log('Successfully fixed the missing comma!');
    } else {
        console.log('Pattern not found. Trying another way...');
        // Let's try to just find "menuType" and see what's after it.
        const menuTypeIndex = jsonString.indexOf('menuType');
        if (menuTypeIndex !== -1) {
            const nextBrace = jsonString.indexOf('}', menuTypeIndex);
            const afterBrace = jsonString.substring(nextBrace, nextBrace + 10);
            console.log('After menuType brace:', afterBrace);
            if (afterBrace.startsWith('}{\\')) {
                jsonString = jsonString.substring(0, nextBrace + 1) + ',' + jsonString.substring(nextBrace + 1);
                const newContent = content.substring(0, stringStart) + jsonString + content.substring(stringEnd);
                fs.writeFileSync(indexPath, newContent);
                console.log('Fixed using index method!');
            }
        }
    }
} else {
    console.error('Marker not found!');
}
