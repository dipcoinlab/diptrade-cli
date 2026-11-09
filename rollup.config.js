import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

/**
 * Restrict the TypeScript plugin's module resolution to the project's own relative
 * imports. Some dependencies (e.g. @scure/base) ship `.ts` sources next to their `.js`
 * builds, and TS resolution would otherwise bundle those raw `.ts` files.
 */
function projectOnlyTypescript(options) {
  const plugin = typescript(options);
  const resolveId = plugin.resolveId;
  plugin.resolveId = function (importee, importer, ...rest) {
    const isRelative = importee.startsWith(".") || importee.startsWith("/");
    if (importee !== "tslib" && (!isRelative || importer?.includes("/node_modules/"))) {
      return null;
    }
    return resolveId.call(this, importee, importer, ...rest);
  };
  return plugin;
}

var rollup_config = [
  {
    input: "cli/index.ts",
    output: {
      file: "dist/cli.cjs",
      format: "cjs",
      banner: "#!/usr/bin/env node",
      sourcemap: true,
      // Some bundled ESM deps use dynamic import(); keep everything in one file.
      inlineDynamicImports: true,
    },
    plugins: [
      nodeResolve({
        preferBuiltins: true,
      }),
      commonjs(),
      projectOnlyTypescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        declarationMap: false,
      }),
    ],
    external: [
      // @mysten/sui v2 and @pythnetwork/pyth-sui-js v4 are ESM-only (or depend on it), so they
      // are bundled into the CJS output instead of being required at runtime.
      "axios",
      "@scure/bip39",
      "@scure/bip39/wordlists/english.js",
      "bignumber.js",
      "buffer",
      "node:buffer",
      "child_process",
      "cli-table3",
      "commander",
      "dotenv",
      "fs",
      "os",
      "path",
      "url",
    ],
  },
];
export { rollup_config as default };
