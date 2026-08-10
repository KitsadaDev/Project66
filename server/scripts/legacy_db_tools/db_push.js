const { execSync } = require('child_process');
const path = require('path');
const serverDir = path.join(__dirname, 'server');
try {
    console.log('Pushing schema to database...');
    const out = execSync('npx prisma db push --accept-data-loss', { cwd: serverDir, encoding: 'utf8' });
    console.log('OUTPUT:', out);
} catch (e) {
    console.log('ERROR:', e.stdout || e.message);
    console.log('STDERR:', e.stderr);
}
