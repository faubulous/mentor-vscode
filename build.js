const fs = require("fs");
const glob = require("glob");
const esbuild = require("esbuild");
const polyfill = require('@esbuild-plugins/node-globals-polyfill');

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
    define: {
      // This is not defined in the browser environment, so we need to provide a polyfill.
      'global': 'globalThis'
    },
    plugins: [
			polyfill.NodeGlobalsPolyfillPlugin({
				process: true,
				buffer: true,
			}),
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
    // mainFields: ["module", "main"],
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

(async () => {
  const args = process.argv.slice(2);
  const productionBuild = isProductionBuild(args);
  const extensionConfig = getExtensionConfig(args);

  console.log("Building extension..");
  console.log("Environment:", productionBuild ? "production" : "development");
  console.log("Extension config:", extensionConfig);

  try {
    if (fs.existsSync('./out')) {
      console.log("Deleting existing out directory..");

      fs.rmSync('./out', { recursive: true });

      // Note: Uncomment this if you want to use SVG icons directly.
      console.log("Copying media files to out directory..");
    }

    fs.mkdirSync('./out');
    fs.mkdirSync('./out/media/glyphs', { recursive: true });

    for (const file of fs.readdirSync('./media/glyphs')) {
      fs.copyFileSync(`./media/glyphs/${file}`, `./out/media/glyphs/${file}`);
    }

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
      // This is the advanced long-running form of "build" that supports additional
      // features such as watch mode and a local development server.
      for (const config of configs) {
        (await esbuild.context(config)).watch();
      }
    } else {
      for (const config of configs) {
        esbuild.build(config);
      }
    }
  } catch (err) {
    process.stderr.write(err.stderr);
    process.exit(1);
  }
})();
