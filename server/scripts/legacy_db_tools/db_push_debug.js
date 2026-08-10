const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const serverDir = path.join(__dirname, 'server');
try {
    console.log('Pushing schema to database...');
    const out = execSync('npx prisma db push --accept-data-loss', { cwd: serverDir, encoding: 'utf8', stdio: 'pipe' });
    fs.writeFileSync('db_push_out.txt', out);
} catch (e) {
    fs.writeFileSync('db_push_out.txt', (e.stdout || '') + '\n' + (e.stderr || '') + '\n' + e.message);
}
