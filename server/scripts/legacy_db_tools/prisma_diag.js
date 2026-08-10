const { exec } = require('child_process');
exec('npx prisma generate', { cwd: 'c:\\Users\\canc9\\OneDrive\\Desktop\\Pro-66\\server' }, (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});
