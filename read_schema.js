const fs = require('fs');
const path = require('path');
const schemaPath = path.join(__dirname, 'server', 'prisma', 'schema.prisma');
try {
    const content = fs.readFileSync(schemaPath, 'utf8');
    console.log('--- SCHEMA CONTENT ---');
    console.log(content);
} catch (e) {
    console.error('Error reading schema:', e);
}
