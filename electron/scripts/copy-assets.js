// Copie les fichiers non-TS (HTML, etc.) de src/ vers dist/
// Lancé automatiquement après `tsc` via npm script.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const DIST = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

const filesToCopy = ['console.html'];

for (const file of filesToCopy) {
  const from = path.join(SRC, file);
  const to = path.join(DIST, file);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
    console.log(`  copy  src/${file} → dist/${file}`);
  } else {
    console.warn(`  skip  src/${file} (introuvable)`);
  }
}

console.log('✓ Assets copiés');
