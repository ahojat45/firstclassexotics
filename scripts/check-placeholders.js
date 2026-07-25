const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const START_DIRS = ['.'];
const SKIP_DIRS = new Set(['.git', 'node_modules', '.netlify', 'netlify']);
const INCLUDE_EXTENSIONS = new Set(['.html']);

const patterns = [
  /\bTODO\b/,
  /\bPLACEHOLDER\b/,
  /\(\s*NNN\s*chars\s*\)/i,
];

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT, fullPath);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(fullPath, out);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!INCLUDE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, idx) => {
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          out.push(`${relPath}:${idx + 1}: ${line.trim()}`);
          break;
        }
      }
    });
  }
}

const matches = [];
for (const startDir of START_DIRS) {
  walk(path.join(ROOT, startDir), matches);
}

if (matches.length > 0) {
  console.error('Placeholder guard failed. Found blocked text in published HTML:');
  matches.forEach((m) => console.error(m));
  process.exit(1);
}

console.log('Placeholder guard passed: no TODO/PLACEHOLDER/(NNN chars) text found in HTML files.');
