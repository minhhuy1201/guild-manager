import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";

import { satisfies } from "semver";
import { describe, expect, it } from "vitest";

/**
 * The lowest ESLint major this package cannot use yet. apps/web is held at eslint 9 by an
 * `ignore` entry in .github/dependabot.yml; this is the version that entry keeps out.
 */
const BLOCKED_ESLINT_VERSION = "10.0.0";

/**
 * Walks up from a file to the `node_modules` directory that contains it.
 *
 * @param file - An absolute path to a real file inside some node_modules tree.
 * @returns The absolute path of the enclosing node_modules directory.
 * @throws If no node_modules directory encloses the file.
 */
function findEnclosingNodeModules(file: string): string {
  let directory = dirname(file);

  while (basename(directory) !== "node_modules") {
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error(`No node_modules directory encloses ${file}`);
    }
    directory = parent;
  }

  return directory;
}

/**
 * Reads the peer range `eslint-plugin-react` declares for `eslint`.
 *
 * The plugin is a transitive dependency of eslint-config-next, so pnpm's strict layout keeps it
 * out of apps/web/node_modules and a plain `require` cannot see it. Resolving the config package
 * and walking up to its own node_modules lands in the store folder that holds both, and the
 * manifest is read off disk because `exports` hides that subpath from the resolver.
 *
 * @returns The semver range string, e.g. "^3 || ^4 || … || ^9.7".
 */
function readReactPluginEslintPeerRange(): string {
  const require = createRequire(import.meta.url);
  const configEntry = realpathSync(require.resolve("eslint-config-next"));
  const manifest = join(
    findEnclosingNodeModules(configEntry),
    "eslint-plugin-react",
    "package.json",
  );

  const { peerDependencies } = JSON.parse(readFileSync(manifest, "utf8")) as {
    peerDependencies: Record<string, string>;
  };

  return peerDependencies.eslint;
}

describe("ghim eslint 9 cho apps/web", () => {
  it("vẫn cần thiết vì eslint-plugin-react chưa hỗ trợ ESLint 10", () => {
    const peerRange = readReactPluginEslintPeerRange();

    // Fails the day eslint-config-next ships a plugin that accepts ESLint 10. When it does:
    // drop the `ignore` block for eslint in .github/dependabot.yml, raise apps/web to
    // "eslint": "^10", and delete this file.
    expect(satisfies(BLOCKED_ESLINT_VERSION, peerRange)).toBe(false);
  });
});
