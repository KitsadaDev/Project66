const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const serverDir = path.join(__dirname, 'server');
const logFile = path.join(__dirname, 'db_push_realtime.log');

const prismaCmd = path.join(serverDir, 'node_modules', '.bin', 'prisma.cmd');

console.log('Starting prisma db push...');
const child = spawn(prismaCmd, ['db', 'push', '--accept-data-loss'], { 
    cwd: serverDir,
    shell: true
});

const logStream = fs.createWriteStream(logFile);

child.stdout.on('data', (data) => {
    console.log(`STDOUT: ${data}`);
    logStream.write(`STDOUT: ${data}\n`);
});

child.stderr.on('data', (data) => {
    console.error(`STDERR: ${data}`);
    logStream.write(`STDERR: ${data}\n`);
});

child.on('close', (code) => {
    console.log(`Process exited with code ${code}`);
    logStream.write(`Process exited with code ${code}\n`);
    logStream.end();
});
