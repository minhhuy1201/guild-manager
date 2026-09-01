// @ts-check
import eslint from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const MODULE_BOUNDARY_MESSAGE =
  'Import qua public API của module: file *.public (code) hoặc *.module (đăng ký DI). Không đụng file nội bộ của module khác.';

/**
 * Hai file vi phạm ranh giới module một cách cố ý, để `src/__tests__/module-boundary.spec.ts` khẳng
 * định luật dưới đây vẫn báo lỗi. Liệt kê từng file chứ không dùng glob `__tests__/fixtures/**`:
 * một fixture tương lai không nên tự động thoát khỏi lint chỉ vì nằm đúng thư mục.
 */
const BOUNDARY_FIXTURES = [
  'src/__tests__/fixtures/outside-module-violation.ts',
  'src/__tests__/fixtures/nested-target-violation.ts',
  'src/modules/attendance/__tests__/fixtures/module-boundary-violation.ts',
];

const LOWER_LAYER_MESSAGE =
  'common/ và config/ không được import từ modules/, shared/ hay infrastructure/.';

/**
 * Ranh giới module, kiểm trên **đường dẫn đã resolve** chứ không phải chuỗi import.
 *
 * `no-restricted-imports` so khớp chuỗi, mà một chuỗi tương đối chỉ có nghĩa khi biết file đang
 * đứng sâu bao nhiêu — nên bản cũ phải khai một block cho mỗi độ sâu, và thêm một cấp thư mục là
 * luật im lặng ngừng kiểm tra ở cấp đó. `boundaries` biết khái niệm "cùng phần tử hay khác phần
 * tử", nên một luật là đủ cho mọi độ sâu.
 *
 * Mỗi thư mục trong `src/modules/` là một phần tử; cửa vào của nó là `*.public.ts` (code) và
 * `*.module.ts` (class module cho `app.module.ts` và các `imports: [...]`). Mọi file khác là nội bộ.
 *
 * `fileInternalPath` cần **hai** pattern. `!(*.public.ts|*.module.ts)` là extglob một tầng: nó
 * không khớp chuỗi có dấu gạch chéo, nên một file nằm sâu hơn gốc module (`dto/character.dto.ts`)
 * không khớp pattern nào, `disallow` không áp, và luật im lặng cho qua. Pattern thứ hai bắt đúng
 * phần đó — mọi đường dẫn có ít nhất một cấp thư mục, mà file lồng thì luôn là nội bộ, vì cả hai
 * cửa vào của module đều nằm ngay ở gốc.
 *
 * Phần tử `app` bắt phần `src/` còn lại. Nó không thừa: `boundaries` bỏ qua mọi phụ thuộc mà nó
 * không phân loại được **cả hai đầu**, nên thiếu nó thì `app.module.ts`, `infrastructure/` và
 * `common/` được import thẳng vào ruột module mà không ai kêu.
 *
 * @returns Các block cấu hình ESLint áp luật ranh giới module cho toàn bộ `src/`
 */
function moduleBoundaryRules() {
  return [
    {
      files: ['src/**/*.ts'],
      plugins: { boundaries },
      settings: {
        // Resolver mặc định của plugin chỉ biết `.js`; không khai `.ts` thì mọi import nội bộ
        // resolve hụt và luật im lặng bỏ qua — đúng kiểu hỏng mà spec này muốn chấm dứt, nên
        // `module-boundary.spec.ts` khoá lại bằng một fixture vi phạm.
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
    // Code do Prisma sinh ra — không lint. Fixture ranh giới module bỏ khỏi lượt lint thường; bài
    // test lint chúng riêng với `--no-ignore`.
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

  // Dependency rules — xem docs/backend.md mục 4.
  //
  // Flat config **thay thế** chứ không gộp rule cùng tên, nên mỗi block `no-restricted-imports`
  // dưới đây phải khai đủ mọi pattern áp cho nhóm file của nó.
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
  {
    // Script chạy tay ngoài app — nó nói chuyện với người qua stdout, không qua logger của Nest.
    files: ['src/scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
);
