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

const langConfig = {
  ...baseConfig,
  bundle: false,
  target: "es2020",
  format: "cjs"
}

// Config for  the turtle language client
/** @type BuildOptions */
const turtleClientConfig = {
  ...langConfig,
  entryPoints: ["./src/language-turtle/client.ts"],
  outfile: "./out/turtle-client.js"
};

// Config for  the turtle language server
/** @type BuildOptions */
const turtleServerConfig = {
  ...langConfig,
  entryPoints: ["./src/language-turtle/server.ts"],
  outfile: "./out/turtle-server.js"
};

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

// Build script
(async () => {
  const args = process.argv.slice(2);
  try {
    if (args.includes("--watch")) {
      // Build and watch extension and webview code
      console.log("[watch] build started");
      await build({
        ...extensionConfig,
        ...watchConfig,
      });
      await build({
        ...webviewConfig,
        ...watchConfig,
      });
      await build({
        ...turtleClientConfig,
        ...watchConfig,
      });
      await build({
        ...turtleServerConfig,
        ...watchConfig,
      });
      console.log("[watch] build finished");
    } else {
      // Build extension and webview code
      await build(extensionConfig);
      await build(webviewConfig);
      await build(turtleClientConfig);
      await build(turtleServerConfig);
      console.log("build complete");
    }
  } catch (err) {
    process.stderr.write(err.stderr);
    process.exit(1);
  }
})();
