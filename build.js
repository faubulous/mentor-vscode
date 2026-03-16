const fs = require("fs");
const glob = require("glob");
const esbuild = require("esbuild");
const path = require("path");

const isProductionBuild = (args) => args.includes("--production");
const isWatchMode = (args) => args.includes("--watch");

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
          if (isWatchMode(args)) {
            build.onStart(() => {
              console.log("- browser: Build started..");
            });

            build.onEnd(result => {
              console.log("- browser: Build ended.");
            })
          }
        },
      }],
  }
}

const getExtensionConfig = (args) => {
  return {
    ...getBaseConfig(args),
    entryPoints: ["./src/extension.browser.ts"],
    outfile: "./dist/extension.js"
  }
}

/**
 * Returns the Node.js base build configuration with platform: 'node'.
 * This configuration is used for the desktop extension host and Node.js language servers.
 */
const getNodeBaseConfig = (args) => {
  const productionBuild = isProductionBuild(args);

  return {
    bundle: true,
    minify: productionBuild,
    sourcemap: !productionBuild,
    format: "cjs",
    external: ["vscode"],
    platform: 'node',
    loader: {
      '.html': 'text',
      '.css': 'text'
    },
    plugins: [
      {
        name: 'rebuild-notify',
        setup(build) {
          if (isWatchMode(args)) {
            build.onStart(() => {
              console.log("- node: Build started..");
            });

            build.onEnd(result => {
              console.log("- node: Build ended.");
            });
          }
        },
      }],
  }
}

const getNodeExtensionConfig = (args) => {
  return {
    ...getNodeBaseConfig(args),
    entryPoints: ["./src/extension.node.ts"],
    outfile: "./dist/extension.node.js"
  }
}

const getNodeLanguageConfig = (args, type, language) => {
  const file = language ? `${language}-language-${type}` : `language-${type}`;
  const entryPoint = language ? `./src/languages/${language}/${file}.node.ts` : `./src/languages/${file}.node.ts`;

  return {
    ...getNodeBaseConfig(args),
    entryPoints: [entryPoint],
    outfile: `./dist/${file}.node.js`
  }
}

const getBrowserLanguageConfig = (args, type, language) => {
  const file = language ? `${language}-language-${type}` : `language-${type}`;
  const sourceFile = language ? `${file}.browser` : file;
  const entryPoint = language ? `./src/languages/${language}/${sourceFile}.ts` : `./src/languages/${sourceFile}.ts`;

  return {
    ...getBaseConfig(args),
    entryPoints: [entryPoint],
    outfile: `./dist/${file}.js`
  }
}

const getReactViewConfig = (args, folder, file) => {
  return {
    ...getBaseConfig(args),
    format: "esm", // Ensure ES module format for the VS Code notebook renderer
    entryPoints: [`./src/views/webviews/${folder}/${file}.tsx`],
    outfile: `./dist/${file}.js`
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
 * Copies the VSCode Codicon CSS and font files to the media directory.
 * The CSS is modified to reference the font file using a relative URL,
 * similar to how mentor-icons.css works.
 */
const copyVSCodeCodiconCSS = () => {
  console.log(`Copying VSCode Codicon CSS and font files..`);

  const sourceFolder = path.resolve(
    __dirname,
    'node_modules',
    '@vscode',
    'codicons',
    'dist'
  );

  const mediaFolder = path.resolve(__dirname, 'media');

  // Ensure media folder exists
  if (!fs.existsSync(mediaFolder)) {
    fs.mkdirSync(mediaFolder, { recursive: true });
  }

  // Copy the codicon.ttf font file to the media directory
  const fontSource = path.join(sourceFolder, 'codicon.ttf');
  const fontTarget = path.join(mediaFolder, 'codicon.ttf');

  fs.copyFileSync(fontSource, fontTarget);

  console.log(` codicon.ttf → media/codicon.ttf`);

  // Read and modify the CSS to reference the font file via URL
  let css = fs.readFileSync(path.join(sourceFolder, 'codicon.css'), 'utf8');

  // Update the font-face src to use a relative URL (will be resolved by webview)
  css = css.replace(
    /src:\s*url\([^)]+\)\s*format\(["']truetype["']\);?/,
    `src: url('codicon.ttf') format('truetype');`
  );
  css = css.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove comments
  css = css.replace(/\s+/g, ' '); // Collapse whitespace
  css = css.trim();

  // Write the modified CSS to the media directory (alongside the font)
  const cssTarget = path.join(mediaFolder, 'codicon.css');

  fs.writeFileSync(cssTarget, css);

  console.log(` codicon.css → media/codicon.css`);

  // Also create a version with inline base64 font for notebook renderers
  // (notebook renderers run in isolated iframes and can't reference external font files)
  const fontData = fs.readFileSync(fontSource);
  const fontBase64 = fontData.toString('base64');
  const inlineCss = css.replace(
    /src:\s*url\([^)]+\)\s*format\(["']truetype["']\);?/,
    `src: url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');`
  );

  const inlineCssTarget = path.join(mediaFolder, 'codicon-inline.css');
  fs.writeFileSync(inlineCssTarget, inlineCss);

  console.log(` codicon-inline.css → media/codicon-inline.css (with embedded font)`);
}

/**
 * Creates an inline version of mentor-icons.css with the font embedded as base64.
 * This is required for notebook renderers which run in isolated iframes.
 */
const createMentorIconsInlineCSS = () => {
  console.log(`Creating inline mentor-icons CSS with embedded font..`);

  const mediaFolder = path.resolve(__dirname, 'media');
  const cssSource = path.join(mediaFolder, 'mentor-icons.css');
  const fontSource = path.join(mediaFolder, 'mentor-icons.woff');

  if (!fs.existsSync(cssSource) || !fs.existsSync(fontSource)) {
    console.log(` Skipping mentor-icons-inline.css (source files not found)`);
    return;
  }

  let css = fs.readFileSync(cssSource, 'utf8');
  const fontData = fs.readFileSync(fontSource);
  const fontBase64 = fontData.toString('base64');

  // Replace the font URL with inline base64 data
  css = css.replace(
    /src:\s*url\([^)]+\)\s*format\(["']woff["']\);?/,
    `src: url('data:font/woff;charset=utf-8;base64,${fontBase64}') format('woff');`
  );

  const inlineCssTarget = path.join(mediaFolder, 'mentor-icons-inline.css');
  fs.writeFileSync(inlineCssTarget, css);

  console.log(` mentor-icons-inline.css → media/mentor-icons-inline.css (with embedded font)`);
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

  const targetFolder = path.resolve(__dirname, 'dist');

  console.log(`Copying VSCode Elements bundle to...`);

  copyFile('bundled.js', sourceFolder, targetFolder, 'vscode-elements.js');
}

/**
 * Removes source map files from the dist directory.
 */
const removeSourceMaps = () => {
  const outFolder = path.resolve(__dirname, 'dist');
  const mapFiles = glob.sync(path.join(outFolder, '**/*.map'));

  if (mapFiles.length > 0) {
    console.log(`Removing ${mapFiles.length} source map file(s) from dist directory...`);

    for (const file of mapFiles) {
      fs.rmSync(file);
      console.log(` Removed: ${file.substring(__dirname.length + 1)}`);
    }
  }
}

(async () => {
  const args = process.argv.slice(2);
  const productionBuild = isProductionBuild(args);
  const extensionConfig = getExtensionConfig(args);

  console.log("Building extension..");
  console.log("Environment:", productionBuild ? "production" : "development");
  console.log("Extension config:", extensionConfig);

  try {
    const outFolder = path.resolve(__dirname, 'dist');

    if (fs.existsSync(outFolder)) {
      console.log(`Deleting existing output directory: ${outFolder}`);

      fs.rmSync(outFolder, { recursive: true });
    }

    fs.mkdirSync(outFolder);

    // copyFontGlyphs();

    copyVSCodeCodiconCSS();
    createMentorIconsInlineCSS();
    copyVSCodeElementsBundle();

    // Copy the language config files to the dist directory.
    for (const file of glob.sync('./src/languages/**/*.json')) {
      const fileName = file.split('/').pop();
      const targetPath = `./dist/${fileName}`;

      fs.copyFileSync(file, targetPath);
    }

    const configs = [
      // Browser builds (Web Workers for language servers, browser extension host)
      extensionConfig,
      getBrowserLanguageConfig(args, 'server'),
      getBrowserLanguageConfig(args, 'server', 'turtle'),
      getBrowserLanguageConfig(args, 'server', 'trig'),
      getBrowserLanguageConfig(args, 'server', 'nquads'),
      getBrowserLanguageConfig(args, 'server', 'ntriples'),
      getBrowserLanguageConfig(args, 'server', 'n3'),
      getBrowserLanguageConfig(args, 'server', 'sparql'),
      getBrowserLanguageConfig(args, 'server', 'xml'),

      // Node.js builds (IPC for language servers, desktop extension host)
      getNodeExtensionConfig(args),
      getNodeLanguageConfig(args, 'server', 'turtle'),
      getNodeLanguageConfig(args, 'server', 'trig'),
      getNodeLanguageConfig(args, 'server', 'nquads'),
      getNodeLanguageConfig(args, 'server', 'ntriples'),
      getNodeLanguageConfig(args, 'server', 'n3'),
      getNodeLanguageConfig(args, 'server', 'sparql'),
      getNodeLanguageConfig(args, 'server', 'xml'),

      // Note: Language clients run in the extension host, not as separate bundles.
      // They are bundled into extension.js via the languages/index.ts barrel export.
      getReactViewConfig(args, 'sparql-results', 'sparql-results-notebook-renderer'),
      getReactViewConfig(args, 'sparql-results', 'sparql-results-panel'),
      getReactViewConfig(args, 'sparql-connection', 'sparql-connection-view'),
      getReactViewConfig(args, 'sparql-connections-list', 'sparql-connections-list-view'),
    ]

    console.log(`\nStarting build with ${configs.length} configuration(s)..`);
    const startTime = Date.now();

    if (isWatchMode(args)) {
      // `esbuild.context` is the advanced long-running form sof 
      // `build` that supports additional features such as watch 
      // mode and a local development server.
      for (const config of configs) {
        (await esbuild.context(config)).watch();
      }
    } else {
      await Promise.all(configs.map(config => esbuild.build(config)));

      // Remove source maps and glyphs from the dist directory in production builds.
      if (productionBuild) {
        removeSourceMaps();
      }
    }

    console.log(`\nBuild completed in ${(Date.now() - startTime)}ms.`);
  } catch (e) {
    process.stderr.write(e.stderr);
    process.exit(1);
  }
})();
