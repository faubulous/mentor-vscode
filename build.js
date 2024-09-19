const { build, context } = require("esbuild");
const fs = require("fs");

const replaceNodeBuiltIns = () => {
  const replace = {
    'path': require.resolve('path-browserify')
  }
  const filter = RegExp(`^(${Object.keys(replace).join("|")})$`);
  return {
    name: "replaceNodeBuiltIns",
    setup(build) {
      build.onResolve({ filter }, arg => ({
        path: replace[arg.path],
      }));
    },
  };
}

//@ts-check
/** @typedef {import('esbuild').BuildOptions} BuildOptions **/

console.log("Building extension..");

var productionBuild = process.env.NODE_ENV?.trim() === "production";

console.log("Environment:", productionBuild ? "production" : "development");

/** @type BuildOptions */
const baseConfig = {
  bundle: true,
  minify: productionBuild,
  sourcemap: !productionBuild,
  external: ["vscode"],
  define: {
    // This is not defined in the browser environment, so we need to provide a polyfill.
    'global': 'globalThis'
  },
  plugins: [
    replaceNodeBuiltIns(),
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
};

console.log("Options:", baseConfig);

// Config for extension source code (to be run in a Node-based context)
/** @type BuildOptions */
const extensionConfig = {
  ...baseConfig,
  format: "cjs",
  target: "es2020",
  mainFields: ["module", "main"],
  entryPoints: ["./src/extension.ts"],
  outfile: "./out/extension.js",
  tsconfig: "./tsconfig.json"
};

// Note: The platform 'node' is required for the 'vscode-languageserver' functions to work.
const getLanguageConfig = (type, language) => {
  const file = language ? `${language}-language-${type}` : `language-${type}`;
  return {
    ...baseConfig,
    format: "cjs",
    target: "es2020",
    entryPoints: [`./src/languages/${file}.ts`],
    outfile: `./out/${file}.js`
  }
}

(async () => {
  try {
    if (fs.existsSync('./out')) {
      console.log("Deleting existing out directory..");

      fs.rmSync('./out', { recursive: true });

      // Note: Uncomment this if you want to use SVG icons directly.
      console.log("Copying media files to out directory..");

      fs.mkdirSync('./out/media/glyphs', { recursive: true });

      for (const file of fs.readdirSync('./media/glyphs')) {
        fs.copyFileSync(`./media/glyphs/${file}`, `./out/media/glyphs/${file}`);
      }
    }

    const args = process.argv.slice(2);

    const configs = [
      extensionConfig,
      getLanguageConfig('server'),
      getLanguageConfig('server', 'turtle'),
      getLanguageConfig('server', 'trig'),
      getLanguageConfig('server', 'sparql'),
      getLanguageConfig('client'),
      getLanguageConfig('client', 'turtle'),
      getLanguageConfig('client', 'trig'),
      getLanguageConfig('client', 'sparql'),
    ]

    if (args.includes("--watch")) {
      // This is the advanced long-running form of "build" that supports additional
      // features such as watch mode and a local development server.
      for (const config of configs) {
        (await context(config)).watch();
      }
    } else {
      for (const config of configs) {
        build(config);
      }
    }
  } catch (err) {
    console.log("Extension config:", extensionConfig);

    process.stderr.write(err.stderr);
    process.exit(1);
  }
})();
