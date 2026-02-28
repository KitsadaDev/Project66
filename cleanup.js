const fs = require('fs');
const files = [
  'client/fetch_thai_db.js',
  'client/fetch_thai_db2.js',
  'fetch_data.js',
  'fetch_thai_db.js',
  'fetch_py.py',
  'fetch_thai_db.py',
  'client/src/utils/thaiData.js'
];
files.forEach(f => {
  try {
    fs.unlinkSync(f);
    console.log("Deleted", f);
  } catch(e) {
    if (e.code === 'ENOENT') {
      console.log("Already deleted", f);
    } else {
      console.log("Failed to delete", f, e.message);
    }
  }
});
