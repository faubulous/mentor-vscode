import { SVGIcons2SVGFontStream } from 'svgicons2svgfont';
import { Font } from 'fonteditor-core';
import fs from 'fs';
import path from 'path';

const fontName = 'mentor-icons';
const sourceDir = path.resolve(process.cwd(), 'media', 'glyphs');
const targetDir = path.resolve(process.cwd(), 'media');

console.log('Building icon font...');
console.log(`Font source: ${sourceDir}`);

const glyphFiles = fs.readdirSync(sourceDir)
  .filter(f => f.toLowerCase().endsWith('.svg'))
  .sort((a, b) => {
    const cpA = parseInt(a.match(/^u([0-9a-fA-F]+)-/)[1], 16);
    const cpB = parseInt(b.match(/^u([0-9a-fA-F]+)-/)[1], 16);
    return cpA - cpB;
  });

console.log(glyphFiles.map(f => path.join(sourceDir, f)));

function buildSvgFont() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = new SVGIcons2SVGFontStream({
      fontName,
      fontHeight: 1000,
      normalize: true,
    });

    stream.on('data', chunk => chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);

    for (const [index, file] of glyphFiles.entries()) {
      const match = file.match(/^u([0-9a-fA-F]+)-(.+)\.svg$/);
      if (!match) continue;

      const codepoint = 0xE000 + index;
      const name = match[2];

      const glyph = fs.createReadStream(path.join(sourceDir, file));
      glyph.metadata = {
        unicode: [String.fromCodePoint(codepoint)],
        name,
      };

      stream.write(glyph);
    }

    stream.end();
  });
}

// Builds a { name: codepoint } map of every glyph in the font. This is the
// single source of truth for the glyph → codepoint assignment; build.js folds
// it into codicon.css (as .codicon-mentor-* rules) so the custom icons are
// usable via <vscode-icon name="mentor-..."> without a second stylesheet.
function generateGlyphMap() {
  const map = {};

  for (const [index, file] of glyphFiles.entries()) {
    const match = file.match(/^u([0-9a-fA-F]+)-(.+)\.svg$/);
    if (!match) continue;

    const codepoint = (0xE000 + index).toString(16);
    const name = match[2];

    map[name] = codepoint;
  }

  return map;
}

async function generateFont() {
  try {
    // Step 1: SVG icons → SVG font
    const svgFontBuffer = await buildSvgFont();
    
    console.log(`\nSVG font generated (${svgFontBuffer.length} bytes)`);

    // Step 2: SVG font → WOFF via fonteditor-core
    const font = Font.create(svgFontBuffer.toString('utf-8'), { type: 'svg' });

    // Fix vertical metrics: fonteditor-core auto-calculates usWinAscent from glyph
    // bounding boxes, which ends up smaller than hhea.ascent and clips the tops of glyphs.
    // Force OS/2 win and typo metrics to match the declared hhea ascent/descent.
    const fontData = font.get();
    const ascent = fontData.hhea.ascent;
    const descent = Math.abs(fontData.hhea.descent);
    fontData['OS/2'].usWinAscent = ascent;
    fontData['OS/2'].usWinDescent = descent;
    fontData['OS/2'].sTypoAscender = ascent;
    fontData['OS/2'].sTypoDescender = -descent;
    font.set(fontData);

    const woff = font.write({ type: 'woff' });
    const woffPath = path.join(targetDir, `${fontName}.woff`);

    fs.writeFileSync(woffPath, Buffer.from(woff));

    console.log(`WOFF written to: ${woffPath}`);

    // Step 3: Write the glyph map consumed by build.js
    const glyphMap = generateGlyphMap();
    const mapPath = path.join(targetDir, `${fontName}.json`);
    fs.writeFileSync(mapPath, JSON.stringify(glyphMap, null, 2) + '\n', 'utf-8');

    console.log(`Glyph map written to: ${mapPath}`);

    console.log('\nFont creation successful.');
  } catch (e) {
    console.error('Font creation failed.', e);
  }
}

generateFont();
