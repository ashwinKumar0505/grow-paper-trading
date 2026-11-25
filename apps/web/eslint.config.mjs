export default [
  {
    ignores: ['dist/**', 'dist-server/**', 'node_modules/**', 'coverage/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: [
      'src/data/**',
      'src/features/quiz/components/TradingCanvas.tsx',
      'src/features/quiz/utils/dataGenerator.ts',
    ],
    rules: {
      'max-lines': 'off',
    },
  },
];
