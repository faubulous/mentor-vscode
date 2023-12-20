const webfont = require('webfont');
const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'media', 'mentor-icons.woff');
const sourceFolder = path.join(__dirname, 'media', 'glyphs');

console.log(`Font source: ${sourceFolder}`);

const icons = fs.readdirSync(sourceFolder)
  .filter(f => f.toLowerCase().endsWith('.svg'))
  .map(f => path.join(sourceFolder, f).replace(/\\/g, '/'));

async function generateFont() {
  try {
    const result = await webfont.webfont({
      files: icons,
      formats: ['woff'],
      startUnicode: 0xE000,
      fontHeight: 1000,
      verbose: true,
      normalize: true,
      sort: false
    });

    fs.writeFileSync(targetFile, result.woff, 'binary');

    console.log(`Font output: ${targetFile}`);
  } catch (e) {
    console.error('Font creation failed.', e);
  }
}

generateFont();
