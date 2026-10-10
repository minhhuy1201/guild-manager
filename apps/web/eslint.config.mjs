import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

/**
 * Files that break the lint rules below on purpose, so `__tests__/lint-rules.test.ts` can assert
 * each rule still reports them. Listed one by one rather than through a `__lint_fixtures__/**` glob:
 * a future fixture should not escape linting just by landing in the right directory.
 */
const LINT_FIXTURES = [
  "features/attendance/__lint_fixtures__/cross-feature-internal.ts",
  "features/attendance/__lint_fixtures__/nested-target.ts",
  "features/attendance/__lint_fixtures__/auth-core-nested.ts",
  "features/attendance/__lint_fixtures__/component-use-query.tsx",
  "components/__lint_fixtures__/component-feature-internal.ts",
  "components/__lint_fixtures__/component-fetch.ts",
  "components/__lint_fixtures__/component-fetch-property.ts",
];

const FEATURE_BOUNDARY_MESSAGE =
  "Import another feature through its entry point: index.ts (client-safe), server.ts (server-only) or core/index.ts (Edge). Do not reach into its internal files.";

/** Tests build their own fixtures and clients; the boundary and TanStack Query rules skip them. */
const TEST_FILES = ["**/__tests__/**", "**/*.test.{ts,tsx}"];

/**
 * The feature boundary, checked against the **resolved path** rather than the import string, as in
 * apps/api/eslint.config.mjs.
 *
 * Each directory under `features/` is an element. Its entry points are `index.ts` (client-safe),
 * `server.ts` (server-only) and `core/index.ts` (Edge); only `auth` has all three. Every other file
 * is internal. `fileInternalPath` needs one pattern per depth: a single-level extglob never matches
 * a path containing a slash, so a nested file would match nothing and pass in silence. The api's
 * catch-all (any path with a slash) cannot be copied: it would also mark `core/index.ts` internal
 * and turn proxy.ts red. A trailing `**` is no good either: it matches zero segments, so
 * `!(core)/**` would call a root `index.ts` internal.
 *
 * The `app` element is the rest of the app. It is not redundant: `boundaries` ignores any
 * dependency whose two ends it cannot both classify. A new file at the web root must be added to
 * it, or its imports go unchecked.
 *
 * `lib/cache-graph.ts` is the one file allowed to import `features/<feature>/api/*-keys.ts`
 * (frontend.md section 4, rule 5). Policies are last-write-wins, so that allow must stay after the
 * disallow.
 *
 * @returns The ESLint config blocks that apply the feature boundary rule
 */
function featureBoundaryRules() {
  return [
    {
      files: ["**/*.{ts,tsx}"],
      ignores: TEST_FILES,
      plugins: { boundaries },
      settings: {
        "boundaries/elements": [
          { type: "feature", pattern: "features/*", capture: ["featureName"] },
          // `partialMatch: false` anchors each pattern at the web root. Unanchored, `lib` also matches
          // `features/members/lib/` and `hooks` matches `features/x/hooks/`, so a feature's own
          // internal files were classified `app` and their imports went unchecked. The `*.ts` globs
          // cover the root files (proxy.ts); boundaries prints a warning about file-like patterns
          // on each run, which is harmless.
          {
            type: "app",
            pattern: [
              "app/**",
              "components/**",
              "config/**",
              "hooks/**",
              "lib/**",
              "*.ts",
              "*.tsx",
            ],
            partialMatch: false,
          },
        ],
      },
      rules: {
        "boundaries/dependencies": [
          "error",
          {
            default: "allow",
            policies: [
              {
                disallow: {
                  to: {
                    element: {
                      type: "feature",
                      fileInternalPath: [
                        "!(index.ts|server.ts)",
                        "!(core)/**/*",
                        "core/!(index.ts)",
                        "core/*/**",
                      ],
                    },
                  },
                },
                message: FEATURE_BOUNDARY_MESSAGE,
              },
              {
                allow: {
                  from: {
                    element: {
                      type: "app",
                      path: "lib",
                      fileInternalPath: "cache-graph.ts",
                    },
                  },
                  to: {
                    element: {
                      type: "feature",
                      fileInternalPath: "api/*-keys.ts",
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    },
  ];
}

const API_CLIENT_MESSAGE =
  "Call the backend through apiFetch in lib/api-client.ts, wrapped by the feature's api/ function.";

const REACT_QUERY_MESSAGE =
  "Components call the feature's hook; only features/*/hooks and features/*/api talk to TanStack Query.";

/**
 * `lib/api-client.ts` is the only caller of `fetch`: it prefixes the API URL, unwraps the envelope
 * and turns error statuses into `ApiError`. Tests stub fetch with `vi.stubGlobal("fetch", ...)`, a
 * string, so they need no exemption.
 *
 * @returns The ESLint config blocks that keep fetch inside the API client
 */
function apiClientRules() {
  return [
    {
      files: ["**/*.{ts,tsx}"],
      ignores: ["lib/api-client.ts"],
      rules: {
        "no-restricted-globals": [
          "error",
          { name: "fetch", message: API_CLIENT_MESSAGE },
        ],
        "no-restricted-properties": [
          "error",
          { object: "window", property: "fetch", message: API_CLIENT_MESSAGE },
          {
            object: "globalThis",
            property: "fetch",
            message: API_CLIENT_MESSAGE,
          },
        ],
      },
    },
  ];
}

/**
 * Components call the feature's hook, never TanStack Query directly. The allowed places: the
 * feature's hooks and api (key factories), the shared `useInvalidate`, the provider that builds the
 * `QueryClient`, and the cache graph. Type-only imports (`QueryKey`) stay allowed everywhere.
 *
 * @returns The ESLint config blocks that keep TanStack Query behind the feature hooks
 */
function reactQueryRules() {
  return [
    {
      files: ["**/*.{ts,tsx}"],
      ignores: [
        "features/*/hooks/**",
        "features/*/api/**",
        "hooks/**",
        "components/providers.tsx",
        "lib/cache-graph.ts",
        ...TEST_FILES,
      ],
      rules: {
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "@tanstack/react-query",
                message: REACT_QUERY_MESSAGE,
                allowTypeImports: true,
              },
            ],
          },
        ],
      },
    },
  ];
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...featureBoundaryRules(),
  ...apiClientRules(),
  ...reactQueryRules(),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Written by `test:cov`. The lcov reporter also emits an HTML report whose bundled scripts
    // carry their own eslint-disable directives, which lint then reports as unused.
    "coverage/**",
    // Linted on their own, with `--no-ignore`, by __tests__/lint-rules.test.ts.
    ...LINT_FIXTURES,
  ]),
]);

export default eslintConfig;
