const { exec } = require('child_process');
const fs = require('fs');

console.log('Starting prisma generation...');
exec('npx prisma generate', (error, stdout, stderr) => {
    let log = '';
    if (error) {
        log += `Error: ${error.message}\n`;
    }
    if (stderr) {
        log += `Stderr: ${stderr}\n`;
    }
    log += `Stdout: ${stdout}\n`;
    fs.writeFileSync('prisma_build.log', log);
    console.log('Done, check prisma_build.log');
});
