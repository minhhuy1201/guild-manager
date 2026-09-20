// @ts-check
import eslint from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const MODULE_BOUNDARY_MESSAGE =
  "Import through a module's public API: a *.public file (code) or a *.module file (DI registration). Do not reach into another module's internal files.";

/**
 * Files that break the module boundary on purpose, so `src/__tests__/module-boundary.spec.ts` can
 * assert the rule below still reports them. Listed one by one rather than through a
 * `__tests__/fixtures/**` glob: a future fixture should not escape linting automatically just by
 * landing in the right directory.
 */
const BOUNDARY_FIXTURES = [
  'src/__tests__/fixtures/outside-module-violation.ts',
  'src/__tests__/fixtures/nested-target-violation.ts',
  'src/modules/attendance/__tests__/fixtures/module-boundary-violation.ts',
];

const LOWER_LAYER_MESSAGE =
  'common/ and config/ must not import from modules/, shared/ or infrastructure/.';

/**
 * The module boundary, checked against the **resolved path** rather than the import string.
 *
 * `no-restricted-imports` matches strings, and a relative string only means something once you
 * know how deep the importing file sits - so the old version needed one block per depth, and
 * adding a directory level silently stopped the rule checking at that level. `boundaries` knows
 * whether two files are in the same element or not, so one rule covers every depth.
 *
 * Each directory under `src/modules/` is an element; its entrances are `*.public.ts` (code) and
 * `*.module.ts` (the module class for `app.module.ts` and every `imports: [...]`). Every other
 * file is internal.
 *
 * `fileInternalPath` needs **two** patterns. `!(*.public.ts|*.module.ts)` is a single-level
 * extglob: it never matches a string containing a slash, so a file below the module root
 * (`dto/character.dto.ts`) matches no pattern, `disallow` does not apply, and the rule passes it
 * in silence. The second pattern covers exactly that - any path with at least one directory
 * level, and a nested file is always internal, because both of a module's entrances sit at its
 * root.
 *
 * The `app` element captures the rest of `src/`. It is not redundant: `boundaries` ignores any
 * dependency whose **two ends** it cannot both classify, so without it `app.module.ts`,
 * `infrastructure/` and `common/` could be imported straight into a module's guts uncontested.
 *
 * @returns The ESLint config blocks that apply the module boundary rule across all of `src/`
 */
function moduleBoundaryRules() {
  return [
    {
      files: ['src/**/*.ts'],
      plugins: { boundaries },
      settings: {
        // The plugin's default resolver only knows `.js`; without `.ts` declared here every
        // internal import fails to resolve and the rule skips it in silence - exactly the failure
        // this setup exists to end, which is why `module-boundary.spec.ts` pins it down with a
        // violating fixture.
        'import/resolver': { node: { extensions: ['.ts', '.js', '.json'] } },
        'boundaries/elements': [
          { type: 'module', pattern: 'src/modules/*' },
          { type: 'app', pattern: 'src' },
        ],
      },
      rules: {
        'boundaries/dependencies': [
          'error',
          {
            default: 'allow',
            policies: [
              {
                disallow: {
                  to: {
                    element: {
                      type: 'module',
                      fileInternalPath: [
                        '!(*.public.ts|*.module.ts)',
                        '*/**',
                      ],
                    },
                  },
                },
                message: MODULE_BOUNDARY_MESSAGE,
              },
            ],
          },
        ],
      },
    },
  ];
}

/**
 * `common/` and `config/` are the bottom layer: they must not depend back on business code.
 *
 * This bans those directories outright, which is stricter than the module boundary rule above, so
 * that rule does not need restating here.
 */
function restrictUpwardImports(files, prefix) {
  return {
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^${prefix}(modules|infrastructure|shared)/`,
              message: LOWER_LAYER_MESSAGE,
            },
          ],
        },
      ],
    },
  };
}

function lowerLayerRules() {
  return [
    // src/common/*.ts, src/config/*.ts
    restrictUpwardImports(['src/common/*.ts', 'src/config/*.ts'], '\\.\\./'),
    // src/common/<group>/*.ts - config/ has no subdirectory today, this is ready for when it does
    restrictUpwardImports(
      ['src/common/*/*.ts', 'src/config/*/*.ts'],
      '\\.\\./\\.\\./',
    ),
  ];
}

export default tseslint.config(
  {
    // Prisma-generated code is not linted. The module boundary fixtures are left out of the
    // normal lint pass; the test lints them on its own with `--no-ignore`.
    ignores: [
      'eslint.config.mjs',
      'src/generated/**',
      'dist/**',
      ...BOUNDARY_FIXTURES,
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },

  // Dependency rules - see docs/backend.md section 4.
  //
  // Flat config **replaces** a rule of the same name rather than merging it, so each
  // `no-restricted-imports` block below has to declare every pattern that applies to its files.
  ...moduleBoundaryRules(),
  ...lowerLayerRules(),
  {
    // Scripts that run outside the app (the Prisma CLI) - the layering rules do not apply.
    files: ['prisma/**/*.ts', 'prisma.config.ts'],
    rules: {
      'no-restricted-imports': 'off',
      'no-console': 'off',
    },
  },
  {
    // Scripts run by hand outside the app - they talk to a person on stdout, not through Nest's
    // logger.
    files: ['src/scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
);
