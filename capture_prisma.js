const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const serverDir = path.join(__dirname, 'server');
let out;
try {
    out = execSync('npx prisma generate', { cwd: serverDir, encoding: 'utf8' });
    fs.writeFileSync('prisma_output.txt', 'OUTPUT:\n' + out);
} catch (e) {
    fs.writeFileSync('prisma_output.txt', 'ERROR:\n' + (e.stdout || e.message) + '\nSTDERR:\n' + e.stderr);
}
