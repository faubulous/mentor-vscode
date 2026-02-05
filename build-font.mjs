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

/**
 * Post-process the generated CSS to create friendlier class names.
 * Converts `.mentor-icons-ue020-databases` to `.mentor-icon.databases`
 * Usage: <span className="mentor-icon databases"></span>
 */
function postProcessCss(cssPath) {
  if (!fs.existsSync(cssPath)) {
    console.warn(`CSS file not found: ${cssPath}`);
    return;
  }

  let css = fs.readFileSync(cssPath, 'utf-8');

  // Replace the selector pattern to use simpler class names
  // From: .mentor-icons-ue000-mentor -> .mentor-icon.mentor
  css = css.replace(/\.mentor-icons-ue[0-9a-f]+-/g, '.mentor-icon.');

  // Update the class prefix selector to target the base .mentor-icon class
  css = css.replace(
    /\[class\^="mentor-icons-"\], \[class\*=" mentor-icons-"\]/g,
    '.mentor-icon'
  );

  fs.writeFileSync(cssPath, css, 'utf-8');
  console.log(`CSS post-processed: ${cssPath}`);
}

async function generateFont() {
  const fontName = 'mentor-icons';
  const sourceDir = path.resolve(process.cwd(), 'media', 'glyphs');
  const targetDir = path.resolve(process.cwd(), 'media');
  const targetFontName = fontName + '.woff';
  const targetFontPath = path.resolve(targetDir, targetFontName);
  const targetStyleName = fontName + '.css';
  const targetStylePath = path.resolve(targetDir, targetStyleName);

  try {
    await svgtofont({
      src: sourceDir,
      dest: targetDir,
      outputDir: '',
      fontName: fontName,
      css: true,
      startUnicode: 0xE000,
      excludeFormat: ["eot", "woff2", "ttf", "svg", "symbol.svg"],
      svgicons2svgfont: {
        fontHeight: 1000,
        normalize: true
      }
    });

    const outputDir = path.resolve(process.cwd(), 'fonts');
    const outputFilePath = path.join(outputDir, targetFontName);
    const outputStylePath = path.join(outputDir, targetStyleName);

    console.log(`\nCSS created at: ${outputStylePath}`);

    if (fs.existsSync(outputStylePath)) {
      fs.renameSync(outputStylePath, targetStylePath);

      console.log(`CSS moved to: ${targetStylePath}`);

      // Post-process the CSS to generate friendlier class names
      postProcessCss(targetStylePath);
    }

    console.log(`\nFont created at: ${outputFilePath}`);

    if (fs.existsSync(outputFilePath)) {
      fs.renameSync(outputFilePath, targetFontPath);
    }

    console.log(`Font moved to: ${targetFontPath}`);

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
