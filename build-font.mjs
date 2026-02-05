import svgtofont from 'svgtofont';
import * as fs from 'fs';
import * as path from 'path';

const sourceFolder = path.resolve(process.cwd(), 'media', 'glyphs');

console.log("Building icon font...");
console.log(`Font source: ${sourceFolder}`);

const icons = fs.readdirSync(sourceFolder)
  .filter(f => f.toLowerCase().endsWith('.svg'))
  .map(f => path.join(sourceFolder, f).replace(/\\/g, '/'))
  .sort((a, b) => {
    // Sort the file names in ascending order based on the number before the first hyphen.
    const numA = parseInt(path.basename(a).split('-')[0]);
    const numB = parseInt(path.basename(b).split('-')[0]);

    return numA - numB;
  });

console.log(icons);

async function generateFont() {
  const fontName = 'mentor-icons';
  const sourceDir = path.resolve(process.cwd(), 'media', 'glyphs');
  const targetDir = path.resolve(process.cwd(), 'media');
  const targetFileName = fontName + '.woff';
  const targetFilePath = path.resolve(targetDir, targetFileName);

  try {
    await svgtofont({
      src: sourceDir,
      dest: targetDir,
      outputDir: '',
      fontName: fontName,
      css: false,
      startUnicode: 0xE000,
      excludeFormat: ["eot", "woff2", "ttf", "svg", "symbol.svg"],
      svgicons2svgfont: {
        fontHeight: 1000,
        normalize: true
      }
    });

    const outputDir = path.resolve(process.cwd(), 'fonts');
    const outputFilePath = path.join(outputDir, targetFileName);

    console.log(`\nFont created at: ${outputFilePath}`);

    if (fs.existsSync(outputFilePath)) {
      fs.renameSync(outputFilePath, targetFilePath);
    }

    console.log(`Font moved to: ${targetFilePath}`);

    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    
    console.log(`Font creation successful.`);

  } catch (e) {
    console.error('Font creation failed.', e);
  }

  console.log();
}

generateFont();
