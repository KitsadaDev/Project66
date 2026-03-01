const { spawn } = require('child_process');
const path = require('path');
const serverDir = path.join(__dirname, 'server');

// Try with absolute path to prisma.cmd if possible
const prismaCmd = path.join(serverDir, 'node_modules', '.bin', 'prisma.cmd');

console.log('Spawning prisma generate...');
const child = spawn(prismaCmd, ['generate'], { 
    cwd: serverDir,
    shell: true
});

child.stdout.on('data', (data) => {
    console.log(`STDOUT: ${data}`);
});

child.stderr.on('data', (data) => {
    console.error(`STDERR: ${data}`);
});

child.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
});
