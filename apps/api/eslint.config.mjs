// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const MODULE_BOUNDARY_MESSAGE =
  'Import qua public API của module (file *.module hoặc provider được exports trong @Module), không import file nội bộ của module khác.';

const LOWER_LAYER_MESSAGE =
  'common/ và config/ không được import từ modules/, shared/ hay infrastructure/.';

/**
 * Dùng `regex` chứ không dùng `group`.
 *
 * `group` so khớp bằng thư viện `ignore` (ngữ nghĩa .gitignore), ở đó `*` khớp **cả `..`** — nên
 * `../*\/**` sẽ nuốt luôn `../../config`, tức chặn nhầm một import hoàn toàn hợp lệ. Class ký tự
 * không cứu được: `[!.]` bị hiểu là "ký tự `!` hoặc `.`", còn `[^.]` thì không khớp gì cả. `regex`
 * diễn đạt được đúng điều kiện "đoạn kế tiếp không phải `..`" bằng một lookahead.
 *
 * @param segment - Đường đi tới `src/modules/` viết đúng như trong code, đã escape cho regex
 */
function moduleInternalsPattern(prefix) {
  return `^${prefix}(?!\\.\\.)[^/]+/(?!.*\\.module$)`;
}

/**
 * Chỉ cho phép import file `*.module` của module khác, không đụng file nội bộ.
 *
 * @param files - Nhóm file áp luật, khoá đúng một độ sâu
 * @param prefix - Đường đi từ file đang lint tới `src/modules/`, đã escape cho regex
 */
function restrictModuleInternals(files, prefix) {
  return {
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: moduleInternalsPattern(prefix),
              message: MODULE_BOUNDARY_MESSAGE,
            },
          ],
        },
      ],
    },
  };
}

/** Luật ranh giới module, khoá theo từng độ sâu file có thật trong `src/`. */
function moduleBoundaryRules() {
  return [
    // src/main.ts, src/app.module.ts
    restrictModuleInternals(['src/*.ts'], '\\./modules/'),
    // src/modules/<tên>/*.ts — module anh em nằm ngay cạnh
    restrictModuleInternals(['src/modules/*/*.ts'], '\\.\\./'),
    // src/modules/<tên>/{dto,entities,__tests__}/*.ts
    restrictModuleInternals(['src/modules/*/*/*.ts'], '\\.\\./\\.\\./'),
    // src/infrastructure/<tên>/*.ts
    restrictModuleInternals(
      ['src/infrastructure/*/*.ts'],
      '\\.\\./\\.\\./modules/',
    ),
  ];
}

/**
 * `common/` và `config/` là tầng dưới cùng: không được phụ thuộc ngược vào business.
 *
 * Cấm hẳn cả thư mục, mạnh hơn luật ranh giới module ở trên, nên không cần khai thêm luật đó.
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
    // src/common/<nhóm>/*.ts — config/ hiện không có thư mục con, để sẵn cho khi có
    restrictUpwardImports(
      ['src/common/*/*.ts', 'src/config/*/*.ts'],
      '\\.\\./\\.\\./',
    ),
  ];
}

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
    },
  },

  // Dependency rules — xem docs/backend.md mục 4.
  //
  // `no-restricted-imports` so khớp glob với **chuỗi import viết trong code**, mà từ khi bỏ alias
  // `@/` (2026-08-16, xem docs/backend.md mục 5) chuỗi đó là đường dẫn tương đối. Số lượng `../`
  // phụ thuộc file nằm sâu bao nhiêu, nên mỗi luật phải gắn với một `files` khoá đúng độ sâu —
  // cùng một pattern `../../*` mang nghĩa khác nhau ở hai độ sâu khác nhau.
  //
  // Flat config **thay thế** chứ không gộp rule cùng tên, nên mỗi block dưới đây phải khai đủ mọi
  // luật áp cho nhóm file của nó.
  ...moduleBoundaryRules(),
  ...lowerLayerRules(),
  {
    // Script chạy ngoài app (Prisma CLI) — không áp luật import theo tầng.
    files: ['prisma/**/*.ts', 'prisma.config.ts'],
    rules: {
      'no-restricted-imports': 'off',
      'no-console': 'off',
    },
  },
);
