import fs from 'fs';
import path from 'path';

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(walk(filePath));
      }
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(filePath);
    }
  });
  return results;
};

const files = walk(process.cwd() + '/../frontend/src');
console.log(`Searching ${files.length} files...`);

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('Log Out') || content.includes('title="Log Out"')) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('Log Out') || line.includes('logout') || line.includes('title=')) {
        console.log(`${path.relative(process.cwd(), file)}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
