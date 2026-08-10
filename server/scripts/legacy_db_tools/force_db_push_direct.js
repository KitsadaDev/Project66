const { execSync } = require('child_process');
const path = require('path');
const serverDir = path.join(__dirname, 'server');

// Direct URL from .env
const directUrl = "postgresql://postgres.snxkzyhyjndxufdswcks:0624216512yhnmju@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";

try {
    console.log('Pushing schema using direct URL...');
    const out = execSync('npx prisma db push --accept-data-loss', { 
        cwd: serverDir, 
        encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: directUrl },
        stdio: 'pipe'
    });
    console.log('OUTPUT:', out);
} catch (e) {
    console.log('ERROR:', e.stdout || e.message);
    console.log('STDERR:', e.stderr);
}
