// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Code do Prisma sinh ra — không lint.
    ignores: ['eslint.config.mjs', 'src/generated/**', 'dist/**'],
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
      // Dependency rules — xem docs/nestjs-folder-structure.md mục 4.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Chỉ cho phép import file *.module của module khác, không đụng file nội bộ.
              group: ['@/modules/*/**', '!@/modules/*/*.module'],
              message:
                'Import qua public API của module (file *.module hoặc provider được exports trong @Module), không import file nội bộ của module khác.',
            },
          ],
        },
      ],
    },
  },
  {
    // common/ và config/ là tầng dưới cùng: không được phụ thuộc ngược vào business.
    files: ['src/common/**/*.ts', 'src/config/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/*', '@/shared/*', '@/infrastructure/*'],
              message:
                'common/ và config/ không được import từ modules/, shared/ hay infrastructure/.',
            },
          ],
        },
      ],
    },
  },
  {
    // Script chạy ngoài app (Prisma CLI) — không áp luật import theo tầng.
    files: ['prisma/**/*.ts', 'prisma.config.ts'],
    rules: {
      'no-restricted-imports': 'off',
      'no-console': 'off',
    },
  },
);
