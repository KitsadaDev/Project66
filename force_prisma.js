const { execSync } = require('child_process');
const path = require('path');
const serverDir = path.join(__dirname, 'server');

function run(cmd) {
    console.log(`> Running: ${cmd}`);
    try {
        const out = execSync(cmd, { cwd: serverDir, encoding: 'utf8', stdio: 'pipe' });
        console.log(out);
    } catch (e) {
        console.error(`Error running ${cmd}:`);
        console.error(e.stdout);
        console.error(e.stderr);
    }
}

run('npx prisma generate');
// Also try to check if the file exists after
run('dir node_modules\\@prisma\\client\\index.js');
