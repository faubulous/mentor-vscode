const { build } = require("esbuild");
const { copy } = require("esbuild-plugin-copy");
const fs = require("fs");

//@ts-check
/** @typedef {import('esbuild').BuildOptions} BuildOptions **/

var productionBuild = process.env.NODE_ENV?.trim() === "production";

console.log("Environment:", productionBuild ? "production" : "development");

/** @type BuildOptions */
const baseConfig = {
  bundle: true,
  minify: productionBuild,
  sourcemap: !productionBuild,
  external: ["vscode"],
};

console.log("Build options:", baseConfig);

// Config for extension source code (to be run in a Node-based context)
/** @type BuildOptions */
const extensionConfig = {
  ...baseConfig,
  platform: "node",
  format: "cjs",
  target: "es2020",
  mainFields: ["module", "main"],
  entryPoints: ["./src/extension.ts"],
  outfile: "./out/extension.js"
};

// Config for webview source code (to be run in a web-based context)
/** @type BuildOptions */
const webviewConfig = {
  ...baseConfig,
  format: "esm",
  target: "es2020",
  entryPoints: ["./src/extension/webview/main.ts"],
  outfile: "./out/webview.js",
  plugins: [
    // Copy webview css and ttf files to `out` directory unaltered
    copy({
      resolveFrom: "cwd",
      assets: {
        from: ["./src/extension/webview/*.css", "./src/extension/webview/*.ttf"],
        to: ["./out/"],
      },
    }),
  ],
};

// Note: The platform 'node' is required for the 'vscode-languageserver' functions to work.
const getLanguageConfig = (type, language) => {
  const file = language ? `${language}-language-${type}` : `language-${type}`;
  return {
    ...baseConfig,
    platform: "node",
    format: "cjs",
    target: "es2020",
    entryPoints: [
      `./src/languages/${file}.ts`
    ],
    outfile: `./out/${file}.js`
  }
}

// This watch config adheres to the conventions of the esbuild-problem-matchers
// extension (https://github.com/connor4312/esbuild-problem-matchers#esbuild-via-js)
/** @type BuildOptions */
const watchConfig = {
  watch: {
    onRebuild(error, result) {
      console.log("[watch] Build started..");
      if (error) {
        error.errors.forEach((error) =>
          console.error(`> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`)
        );
      } else {
        console.log("[watch] Build finished.");
      }
    },
  },
};

(async () => {
  try {
    if (fs.existsSync('./out')) {
      console.log("Deleting existing out directory..");

      fs.rmSync('./out', { recursive: true });
    }

    const args = process.argv.slice(2);

    if (args.includes("--watch")) {
      console.log("[watch] Build started..");
      await build({ ...extensionConfig, ...watchConfig });
      await build({ ...webviewConfig, ...watchConfig });
      await build({ ...getLanguageConfig('server'), ...watchConfig });
      await build({ ...getLanguageConfig('server', 'turtle'), ...watchConfig });
      await build({ ...getLanguageConfig('server', 'trig'), ...watchConfig });
      await build({ ...getLanguageConfig('server', 'sparql'), ...watchConfig });
      await build({ ...getLanguageConfig('client'), ...watchConfig });
      await build({ ...getLanguageConfig('client', 'turtle'), ...watchConfig });
      await build({ ...getLanguageConfig('client', 'trig'), ...watchConfig });
      await build({ ...getLanguageConfig('client', 'sparql'), ...watchConfig });
      console.log("[watch] Build finished.");
    } else {
      console.log("Build started..");
      await build(extensionConfig);
      await build(webviewConfig);
      await build(getLanguageConfig('server'));
      await build(getLanguageConfig('server', 'turtle'));
      await build(getLanguageConfig('server', 'trig'));
      await build(getLanguageConfig('server', 'sparql'));
      await build(getLanguageConfig('client'));
      await build(getLanguageConfig('client', 'turtle'));
      await build(getLanguageConfig('client', 'trig'));
      await build(getLanguageConfig('client', 'sparql'));
      console.log("Build finished.");
    }
  } catch (err) {
    process.stderr.write(err.stderr);
    process.exit(1);
  }
})();
