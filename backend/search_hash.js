import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const searchDir = path.resolve(__dirname, '..');

function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.gemini') {
        searchFiles(filePath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.sql') || file.endsWith('.md')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('eOqbs4tuKQdVJ86QXi0Gj')) {
        console.log(`MATCH: File: ${filePath}`);
      }
    }
  }
}

searchFiles(searchDir);
