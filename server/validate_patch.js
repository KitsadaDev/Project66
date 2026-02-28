const fs = require('fs');
const indexPath = 'c:/Users/canc9/OneDrive/Desktop/Pro-66/server/node_modules/.prisma/client/index.js';
const content = fs.readFileSync(indexPath, 'utf8');

const modelMarker = 'config.runtimeDataModel = JSON.parse("';
const modelStartIndex = content.indexOf(modelMarker);
if (modelStartIndex !== -1) {
    const stringStart = modelStartIndex + modelMarker.length;
    const stringEnd = content.indexOf('")', stringStart);
    let jsonString = content.substring(stringStart, stringEnd);
    
    try {
        const json = JSON.parse(jsonString.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
        console.log('JSON is VALID');
        console.log('Model names:', Object.keys(json.models));
        const rentalContract = json.models.RentalContract;
        console.log('RentalContract fields count:', rentalContract.fields.length);
        const addedFields = rentalContract.fields.filter(f => ['idCard', 'phone', 'address'].includes(f.name));
        console.log('Added fields found:', addedFields.map(f => f.name));
    } catch (e) {
        console.error('JSON is INVALID!');
        console.error(e.message);
        // Print the area around the error
        const pos = e.message.match(/at position (\d+)/);
        if (pos) {
            const p = parseInt(pos[1]);
            console.log('Error context:', jsonString.substring(Math.max(0, p - 100), Math.min(jsonString.length, p + 100)));
        }
    }
} else {
    console.error('Marker not found!');
}
