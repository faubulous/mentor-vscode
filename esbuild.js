const { build } = require("esbuild");
const { copy } = require("esbuild-plugin-copy");

//@ts-check
/** @typedef {import('esbuild').BuildOptions} BuildOptions **/

/** @type BuildOptions */
const baseConfig = {
  bundle: true,
  minify: process.env.NODE_ENV === "production",
  sourcemap: process.env.NODE_ENV !== "production",
};

// Config for extension source code (to be run in a Node-based context)
/** @type BuildOptions */
const extensionConfig = {
  ...baseConfig,
  platform: "node",
  mainFields: ["module", "main"],
  format: "cjs",
  entryPoints: ["./src/extension.ts"],
  outfile: "./out/extension.js",
  external: ["vscode"],
};

// Config for webview source code (to be run in a web-based context)
/** @type BuildOptions */
const webviewConfig = {
  ...baseConfig,
  target: "es2020",
  format: "esm",
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

const getLanguageConfig = (type, language) => {
  const name = language ? `${type}-${language}` : type;
  return {
    ...baseConfig,
    // Don't bundle the language server or client as this will result in errors.
    bundle: false,
    target: "es2020",
    format: "cjs",
    entryPoints: [
      `./src/languages/language-${name}.ts`
    ],
    outfile: `./out/language-${name}.js`
  }
}

// This watch config adheres to the conventions of the esbuild-problem-matchers
// extension (https://github.com/connor4312/esbuild-problem-matchers#esbuild-via-js)
/** @type BuildOptions */
const watchConfig = {
  watch: {
    onRebuild(error, result) {
      console.log("[watch] build started");
      if (error) {
        error.errors.forEach((error) =>
          console.error(
            `> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`
          )
        );
      } else {
        console.log("[watch] build finished");
      }
    },
  },
};

(async () => {
  try {
    const args = process.argv.slice(2);

    if (args.includes("--watch")) {
      console.log("[watch] build started");
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
      console.log("[watch] build finished");
    } else {
      console.log("build started");
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
      console.log("build finished");
    }
  } catch (err) {
    process.stderr.write(err.stderr);
    process.exit(1);
  }
})();
