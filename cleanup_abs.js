const fs = require('fs');
const files = [
  'C:\\Users\\canc9\\OneDrive\\Desktop\\Pro-66\\client\\fetch_thai_db.js',
  'C:\\Users\\canc9\\OneDrive\\Desktop\\Pro-66\\client\\fetch_thai_db2.js',
  'C:\\Users\\canc9\\OneDrive\\Desktop\\Pro-66\\fetch_data.js',
  'C:\\Users\\canc9\\OneDrive\\Desktop\\Pro-66\\fetch_thai_db.js',
  'C:\\Users\\canc9\\OneDrive\\Desktop\\Pro-66\\fetch_py.py',
  'C:\\Users\\canc9\\OneDrive\\Desktop\\Pro-66\\fetch_thai_db.py',
  'C:\\Users\\canc9\\OneDrive\\Desktop\\Pro-66\\client\\src\\utils\\thaiData.js'
];
files.forEach(f => {
  try {
    fs.unlinkSync(f);
    console.log("Deleted", f);
  } catch(e) {
    console.error("Failed", f, e.message);
  }
});
