module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint',
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['html'],
  env: {
    browser: true,
    node: true,
  },

  rules: {
    indent: ['error', 2, { SwitchCase: 1 }],
    'space-infix-ops': ['error', { int32Hint: false }],
    'key-spacing': [
      2,
      {
        beforeColon: false,
        afterColon: true,
      },
    ],
    'no-octal': 2,
    'no-redeclare': 2,
    'comma-spacing': 2,
    'no-new-object': 2,
    'arrow-spacing': 2,
    quotes: [
      2,
      'single',
      {
        avoidEscape: true,
        allowTemplateLiterals: true,
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      extends: [
        'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
        // 'prettier/@typescript-eslint',
      ],
    },
    {
      // 281 个路由由 module/*.js 机械迁移而来，上游数据形状本就是任意结构；
      // 强行收类型会为了过 lint 而扭曲语义。等阶段分级收紧 strict 时再逐块收。
      files: ['src/routes/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        // 上游 module/*.js 里就有未使用的 require/局部变量（如 sheet/list.js 的 crypto），
        // 机械迁移后保留原样；逐个手改 281 个文件只会引入行为风险，收益为零
        '@typescript-eslint/no-unused-vars': 'off',
        quotes: 'off',
        indent: 'off',
        'key-spacing': 'off',
        'comma-spacing': 'off',
        'space-infix-ops': 'off',
        'no-useless-escape': 'off',
        'no-undef': 'off',
        'prefer-const': 'off',
        'no-new-object': 'off',
        'arrow-spacing': 'off',
        '@typescript-eslint/no-empty-function': 'off',
      },
    },
    {
      // 无类型第三方包 / 浏览器全局的声明文件：这里只能用 any 描述外部形状
      files: ['**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      // 第三方来源的抓取器（qq / kugou），保持与上游一致，不做风格改造
      files: ['src/core/multiverse/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        quotes: 'off',
        indent: 'off',
        'key-spacing': 'off',
        'comma-spacing': 'off',
        'space-infix-ops': 'off',
        'no-useless-escape': 'off',
        'no-empty': 'off',
        'prefer-const': 'off',
        'no-new-object': 'off',
        'arrow-spacing': 'off',
        '@typescript-eslint/no-empty-function': 'off',
      },
    },
  ],
}
