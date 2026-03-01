const { execSync } = require('child_process');
const path = require('path');
const serverDir = path.join(__dirname, 'server');
try {
    const out = execSync('npx prisma generate', { cwd: serverDir, encoding: 'utf8' });
    console.log('OUTPUT:', out);
} catch (e) {
    console.log('ERROR:', e.stdout || e.message);
    console.log('STDERR:', e.stderr);
}
