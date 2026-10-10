import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ESLint, Linter } from "eslint";
import { describe, expect, it } from "vitest";

/** Root of `apps/web` — where `eslint.config.mjs` lives. */
const WEB_ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Running ESLint takes a few seconds; Vitest's 5s default is not enough. */
const LINT_TIMEOUT_MS = 60_000;

const RULE = {
  boundaries: "boundaries/dependencies",
  fetchGlobal: "no-restricted-globals",
  fetchProperty: "no-restricted-properties",
  reactQuery: "@typescript-eslint/no-restricted-imports",
} as const;

type LintRuleId = (typeof RULE)[keyof typeof RULE];

/**
 * Run the real ESLint over one file and return the messages one rule reported for it.
 *
 * A child process rather than `new ESLint()`, matching the api's `module-boundary.spec.ts`: it runs
 * exactly what `pnpm lint` runs. `--no-ignore` lints the fixtures, which the config's global ignore
 * would otherwise skip.
 *
 * @param relativePath - Path of the file to lint, relative to `apps/web`
 * @param ruleId - The rule whose messages to keep
 * @param source - Lint this text as if it were the file at `relativePath`, instead of reading the
 *   file. For a path that must not get a fixture of its own, such as a file at the web root.
 * @returns The messages that rule reported for the file
 */
function lintErrors(
  relativePath: string,
  ruleId: LintRuleId,
  source?: string,
): Linter.LintMessage[] {
  const args =
    source === undefined
      ? ["--no-ignore", "--format", "json", relativePath]
      : ["--no-ignore", "--format", "json", "--stdin", "--stdin-filename", relativePath];
  const { stdout, status } = spawnSync(
    join(WEB_ROOT, "node_modules", ".bin", "eslint"),
    args,
    { cwd: WEB_ROOT, encoding: "utf8", input: source },
  );

  // ESLint exits 0 when clean and 1 on lint errors; any other code means it died before linting.
  if (status !== 0 && status !== 1) {
    throw new Error(`ESLint không chạy được (exit ${String(status)})`);
  }

  const [result] = JSON.parse(stdout) as ESLint.LintResult[];
  if (!result) {
    throw new Error(`ESLint không trả kết quả nào cho ${relativePath}`);
  }

  return result.messages.filter((message) => message.ruleId === ruleId);
}

/**
 * These rules are only worth having while they are still in force. A resolver that cannot read the
 * `@/` alias turns the boundary rule off without a word, so every rule gets a fixture that must go
 * red, and every exception gets a real file that must stay green.
 */
describe(
  "luật lint của web (eslint.config.mjs)",
  { timeout: LINT_TIMEOUT_MS },
  () => {
    describe("ranh giới feature", () => {
      it("báo lỗi khi một feature đụng file nội bộ của feature khác", () => {
        expect(
          lintErrors(
            "features/attendance/__lint_fixtures__/cross-feature-internal.ts",
            RULE.boundaries,
          ),
        ).toHaveLength(1);
      });

      it("báo lỗi khi code ngoài features/ đụng file nội bộ của feature", () => {
        expect(
          lintErrors(
            "components/__lint_fixtures__/component-feature-internal.ts",
            RULE.boundaries,
          ),
        ).toHaveLength(1);
      });

      it("báo lỗi khi file bị đụng nằm sâu hơn gốc feature hai cấp", () => {
        expect(
          lintErrors(
            "features/attendance/__lint_fixtures__/nested-target.ts",
            RULE.boundaries,
          ),
        ).toHaveLength(1);
      });

      it("báo lỗi khi file bị đụng nằm sâu bên trong core/", () => {
        expect(
          lintErrors(
            "features/attendance/__lint_fixtures__/auth-core-nested.ts",
            RULE.boundaries,
          ),
        ).toHaveLength(1);
      });

      it("báo lỗi khi file nằm trực tiếp trong core/ ngoài index.ts", () => {
        expect(
          lintErrors(
            "features/attendance/__lint_fixtures__/auth-core-file.ts",
            RULE.boundaries,
          ),
        ).toHaveLength(1);
      });

      it("báo lỗi khi file ở gốc web (proxy.ts) đụng file nội bộ của feature", () => {
        expect(
          lintErrors(
            "proxy.ts",
            RULE.boundaries,
            'import { isLastAdmin } from "@/features/members/lib/last-admin";\nexport const fixture = isLastAdmin;\n',
          ),
        ).toHaveLength(1);
      });

      it("cho lib/cache-graph.ts import thẳng file *-keys.ts của mọi feature", () => {
        expect(lintErrors("lib/cache-graph.ts", RULE.boundaries)).toHaveLength(
          0,
        );
      });

      it("cho proxy.ts import auth qua core/index.ts", () => {
        expect(lintErrors("proxy.ts", RULE.boundaries)).toHaveLength(0);
      });

      it("không báo lỗi khi component import feature qua index.ts và server.ts", () => {
        expect(
          lintErrors("components/shared/site-header.tsx", RULE.boundaries),
        ).toHaveLength(0);
      });
    });

    describe("fetch chỉ nằm trong lib/api-client.ts", () => {
      it("báo lỗi khi component gọi fetch", () => {
        expect(
          lintErrors(
            "components/__lint_fixtures__/component-fetch.ts",
            RULE.fetchGlobal,
          ),
        ).toHaveLength(1);
      });

      it("báo lỗi cho cả window.fetch lẫn globalThis.fetch", () => {
        expect(
          lintErrors(
            "components/__lint_fixtures__/component-fetch-property.ts",
            RULE.fetchProperty,
          ),
        ).toHaveLength(2);
      });

      it("cho lib/api-client.ts gọi fetch", () => {
        expect(lintErrors("lib/api-client.ts", RULE.fetchGlobal)).toHaveLength(
          0,
        );
      });
    });

    describe("TanStack Query chỉ nằm trong hooks và api của feature", () => {
      it("báo đúng một lỗi khi component import useQuery, bỏ qua import type", () => {
        expect(
          lintErrors(
            "features/attendance/__lint_fixtures__/component-use-query.tsx",
            RULE.reactQuery,
          ),
        ).toHaveLength(1);
      });

      it("cho components/providers.tsx dựng QueryClientProvider", () => {
        expect(
          lintErrors("components/providers.tsx", RULE.reactQuery),
        ).toHaveLength(0);
      });
    });
  },
);
