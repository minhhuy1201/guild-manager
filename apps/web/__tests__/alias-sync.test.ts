import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import vitestConfig from "../vitest.config";

/** Root of `apps/web` — where `tsconfig.json` and `vitest.config.ts` live. */
const WEB_ROOT = fileURLToPath(new URL("..", import.meta.url));

type AliasMap = Record<string, string>;

type TsconfigPaths = Record<string, string[]>;

/**
 * Turn tsconfig `paths` into Vitest's alias shape: `"@/*": ["./*"]` becomes `{ "@": <root> }`.
 * Vitest takes one target per alias, so only the first tsconfig target counts.
 */
function tsconfigAliases(paths: TsconfigPaths, root: string): AliasMap {
  return Object.fromEntries(
    Object.entries(paths).map(([key, [target]]) => [
      key.replace(/\/\*$/, ""),
      resolve(root, target.replace(/\/\*$/, "")),
    ]),
  );
}

/**
 * Both sides go through `resolve` so a trailing slash (`new URL(".")` keeps one) is not a drift.
 *
 * @returns One line per alias missing on one side or pointing somewhere else
 */
function aliasDrift(fromTsconfig: AliasMap, fromVitest: AliasMap): string[] {
  const keys = [...new Set([...Object.keys(fromTsconfig), ...Object.keys(fromVitest)])].sort();

  return keys.flatMap((key) => {
    if (!(key in fromTsconfig)) {
      return [`${key}: in vitest.config.ts but not in tsconfig.json paths`];
    }
    if (!(key in fromVitest)) {
      return [`${key}: in tsconfig.json paths but not in vitest.config.ts`];
    }

    const tsconfigTarget = resolve(fromTsconfig[key]);
    const vitestTarget = resolve(fromVitest[key]);
    if (tsconfigTarget === vitestTarget) {
      return [];
    }

    return [`${key}: tsconfig.json points at ${tsconfigTarget}, vitest.config.ts at ${vitestTarget}`];
  });
}

/** `resolve.alias` may also be an array; this app uses the object form, and anything else is drift. */
function vitestAliases(): AliasMap {
  const alias = vitestConfig.resolve?.alias;
  if (alias === undefined || Array.isArray(alias)) {
    throw new Error("vitest.config.ts: resolve.alias must be an object of { alias: path }");
  }

  return alias as AliasMap;
}

describe("alias của tsconfig.json khớp vitest.config.ts", () => {
  it("mỗi alias khai ở cả hai nơi và trỏ cùng thư mục", () => {
    const tsconfig = JSON.parse(readFileSync(resolve(WEB_ROOT, "tsconfig.json"), "utf8")) as {
      compilerOptions: { paths: TsconfigPaths };
    };

    expect(
      aliasDrift(tsconfigAliases(tsconfig.compilerOptions.paths, WEB_ROOT), vitestAliases()),
    ).toEqual([]);
  });

  describe("đỏ được khi lệch (dữ liệu giả)", () => {
    it("đổi `@/*` của tsconfig thành dạng alias của Vitest", () => {
      expect(tsconfigAliases({ "@/*": ["./*"] }, "/web")).toEqual({ "@": "/web" });
    });

    it("báo alias tsconfig có mà Vitest thiếu", () => {
      expect(aliasDrift({ "@": "/web", "~": "/web/lib" }, { "@": "/web/" })).toEqual([
        "~: in tsconfig.json paths but not in vitest.config.ts",
      ]);
    });

    it("báo alias Vitest có mà tsconfig thiếu", () => {
      expect(aliasDrift({ "@": "/web" }, { "@": "/web", "~": "/web/lib" })).toEqual([
        "~: in vitest.config.ts but not in tsconfig.json paths",
      ]);
    });

    it("báo alias trỏ hai thư mục khác nhau", () => {
      expect(aliasDrift({ "@": "/web" }, { "@": "/web/src" })).toEqual([
        "@: tsconfig.json points at /web, vitest.config.ts at /web/src",
      ]);
    });
  });
});
