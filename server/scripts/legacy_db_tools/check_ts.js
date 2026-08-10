const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, 'server', 'node_modules', '.prisma', 'client', 'index.d.ts');
try {
    const stats = fs.statSync(target);
    console.log(`File: ${target}`);
    console.log(`Modified: ${stats.mtime}`);
    console.log(`Current: ${new Date()}`);
} catch (e) {
    console.log(`File not found or error: ${e.message}`);
}
