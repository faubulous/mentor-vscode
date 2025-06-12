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
      // Configure HTML files to be imported as text/strings
      '.html': 'text'
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

const copyVSCodeElementsBundle = () => {
  const bundledSource = path.resolve(
    __dirname,
    'node_modules',
    '@vscode-elements',
    'elements',
    'dist',
    'bundled.js'
  );

  const targetFolder = path.resolve(__dirname, 'media');
  const targetFile = path.join(targetFolder, 'vscode-elements.js');

  console.log(`Copying VSCode Elements bundle to: ${targetFile}`);

  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  fs.copyFileSync(bundledSource, targetFile);
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

    // Copy the SVG font icons to the out directory.
    copyFontGlyphs();

    // Copy the VSCode Elements bundle to the media directory.
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
