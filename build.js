const fs = require("fs");
const glob = require("glob");
const esbuild = require("esbuild");
const path = require("path");

const isProductionBuild = (args) => args.includes("--production");

const getBaseConfig = (args) => {
  const productionBuild = isProductionBuild(args);

  return {
    bundle: true,
    minify: productionBuild,
    sourcemap: !productionBuild,
    format: "cjs",
    external: ["vscode"],
    platform: 'browser',
    loader: {
      // Configure HTML and CSS files to be imported as strings
      '.html': 'text',
      '.css': 'text'
    },
    define: {
      // This is not defined in the browser environment, so we need to provide a polyfill.
      'global': 'globalThis'
    },
    plugins: [
      {
        name: 'rebuild-notify',
        setup(build) {
          build.onStart(() => {
            console.log("Build started..");
          });

          build.onEnd(result => {
            console.log(`Build ended.`);
          })
        },
      }],
  }
}

const getExtensionConfig = (args) => {
  return {
    ...getBaseConfig(args),
    entryPoints: ["./src/extension.ts"],
    outfile: "./out/extension.js"
  }
}

const getLanguageConfig = (args, type, language) => {
  const file = language ? `${language}-language-${type}` : `language-${type}`;
  const entryPoint = language ? `./src/languages/${language}/${file}.ts` : `./src/languages/${file}.ts`;

  return {
    ...getBaseConfig(args),
    entryPoints: [entryPoint],
    outfile: `./out/${file}.js`
  }
}

const getReactViewConfig = (args, folder, file) => {
  return {
    ...getBaseConfig(args),
    format: "esm", // Ensure ES module format for the VS Code notebook renderer
    entryPoints: [`./src/views/webviews/${folder}/${file}.tsx`],
    outfile: `./out/${file}.js`
  }
}

/**
 * Copies SVG glyph files from the extension media directory to the package media directory.
 */
const copyFontGlyphs = () => {
  const sourceFolder = path.resolve(__dirname, 'media', 'glyphs');
  const targetFolder = path.resolve(__dirname, 'out', 'media', 'glyphs');

  console.log(`Copying font glyphs to: ${targetFolder}`);

  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  for (const file of fs.readdirSync(sourceFolder)) {
    const sourceFile = path.join(sourceFolder, file);
    const targetFile = path.join(targetFolder, file);

    fs.copyFileSync(sourceFile, targetFile);
  }
}

const copyFile = (fileName, sourceFolder, targetFolder, targetName = undefined) => {
  const sourcePath = path.join(sourceFolder, fileName);
  const targetPath = path.join(targetFolder, targetName ?? fileName);

  if (fs.existsSync(sourcePath)) {
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const sourceRelative = sourcePath.substring(__dirname.length + 1);
    const targetRelative = targetPath.substring(__dirname.length + 1);

    console.log(` ${sourceRelative} → ${targetRelative}`);

    fs.copyFileSync(sourcePath, targetPath);
  } else {
    throw new Error(`File not found: ${sourcePath}`);
  }
}

/**
 * Creates a bundle for the VSCode Codicon CSS file. It reads the codicon CSS file,
 * replaces the font-face src with a base64 encoded data URL for the codicon.ttf file,
 * and writes the modified CSS to the output directory.
 * 
 * @note This is necessary because the VSCode Notebook renderer webview does not 
 * support loading local font files directly. When registering the webview, there is no
 * ExtensionContext to provide the media path, so we need to embed the font data directly
 * in the CSS. This comes at the cost of increased bundle size, which is loaded for every
 * webview instance in the notebook.
 */
const copyVSCodeCodiconCSS = () => {
  console.log(`Creating VSCode Codicon CSS bundle..`);

  const sourceFolder = path.resolve(
    __dirname,
    'node_modules',
    '@vscode',
    'codicons',
    'dist'
  );

  // Create a base64 string for the codicon truetype font file
  const fontBase64 = fs.readFileSync(path.join(sourceFolder, 'codicon.ttf')).toString('base64');

  // Patch font-face src to use base64 data URL
  let css = fs.readFileSync(path.join(sourceFolder, 'codicon.css'), 'utf8');

  css = css.replace(
    /src:\s*url\([^)]+\)\s*format\(["']truetype["']\);?/,
    `src: url("data:font/truetype;charset=utf-8;base64,${fontBase64}") format("truetype");`
  );
  css = css.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove comments
  css = css.replace(/\s+/g, ' '); // Collapse whitespace
  css = css.trim();

  // Write the modified CSS to the output directory..
  const targetFolder = path.resolve(__dirname, 'out');
  const targetPath = path.join(targetFolder, 'codicon.css');

  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  fs.writeFileSync(targetPath, css);

  console.log(` ${targetPath.substring(__dirname.length + 1)}`);
}

/**
 * Copies the VSCode Elements bundle to the media directory.
 */
const copyVSCodeElementsBundle = () => {
  const sourceFolder = path.resolve(
    __dirname,
    'node_modules',
    '@vscode-elements',
    'elements',
    'dist'
  );

  const targetFolder = path.resolve(__dirname, 'out');

  console.log(`Copying VSCode Elements bundle to...`);

  copyFile('bundled.js', sourceFolder, targetFolder, 'vscode-elements.js');
}

(async () => {
  const args = process.argv.slice(2);
  const productionBuild = isProductionBuild(args);
  const extensionConfig = getExtensionConfig(args);

  console.log("Building extension..");
  console.log("Environment:", productionBuild ? "production" : "development");
  console.log("Extension config:", extensionConfig);

  try {
    const outFolder = path.resolve(__dirname, 'out');

    if (fs.existsSync(outFolder)) {
      console.log(`Deleting existing output directory: ${outFolder}`);

      fs.rmSync(outFolder, { recursive: true });
    }

    fs.mkdirSync(outFolder);

    // copyFontGlyphs();

    copyVSCodeCodiconCSS();
    copyVSCodeElementsBundle();

    // Copy the language config files to the out directory.
    for (const file of glob.sync('./src/languages/**/*.json')) {
      const fileName = file.split('/').pop();
      const targetPath = `./out/${fileName}`;

      fs.copyFileSync(file, targetPath);
    }

    const configs = [
      extensionConfig,
      getLanguageConfig(args, 'server'),
      getLanguageConfig(args, 'server', 'turtle'),
      getLanguageConfig(args, 'server', 'trig'),
      getLanguageConfig(args, 'server', 'sparql'),
      getLanguageConfig(args, 'client'),
      getLanguageConfig(args, 'client', 'turtle'),
      getLanguageConfig(args, 'client', 'trig'),
      getLanguageConfig(args, 'client', 'sparql'),
      getReactViewConfig(args, 'sparql-results', 'sparql-results-notebook-renderer'),
      getReactViewConfig(args, 'sparql-results', 'sparql-results-panel'),
      getReactViewConfig(args, 'sparql-connection', 'sparql-connection-view'),
    ]

    if (args.includes("--watch")) {
      // `esbuild.context` is the advanced long-running form sof 
      // `build` that supports additional features such as watch 
      // mode and a local development server.
      for (const config of configs) {
        (await esbuild.context(config)).watch();
      }
    } else {
      for (const config of configs) {
        esbuild.build(config);
      }
    }
  } catch (e) {
    process.stderr.write(e.stderr);
    process.exit(1);
  }
})();
