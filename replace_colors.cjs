const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'src', 'App.jsx'),
  path.join(__dirname, 'src', 'AdminDashboard.jsx'),
  path.join(__dirname, 'App.jsx'),
  path.join(__dirname, 'AdminDashboard.jsx')
];

const replacements = [
  { from: /#3E2F2F/gi, to: '#2A2431' },
  { from: /#6F4E37/gi, to: '#7E6A93' },
  { from: /#EFBF04/gi, to: '#A284C5' },
  { from: /#FDFBD4/gi, to: '#F7F5FA' },
  { from: /#F9F7E8/gi, to: '#F7F5FA' },
  { from: /#ADEBB3/gi, to: '#EBE6F0' },
  { from: /239,191,4/g, to: '162,132,197' },
  { from: /111,78,55/g, to: '126,106,147' },
  { from: /bg-yellow-100/g, to: 'bg-purple-100' },
  { from: /text-yellow-700/g, to: 'text-purple-700' },
  { from: /bg-orange-100/g, to: 'bg-fuchsia-100' },
  { from: /text-orange-700/g, to: 'text-fuchsia-700' }
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    replacements.forEach(r => {
      content = content.replace(r.from, r.to);
    });
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
