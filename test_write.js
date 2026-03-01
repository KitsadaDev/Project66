const fs = require('fs');
fs.writeFileSync('test_write.txt', 'hello from node\n');
console.log('wrote file');
