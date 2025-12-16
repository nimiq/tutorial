import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  unocss: true,
  astro: true,
  ignores: ['./public/widget.css', './public/widget.js', './src/components/CustomTopBar.astro'],
}, {
  rules: {
    'no-console': 'off',
  },
}, {
  files: ['./src/content/tutorial/**/*'],
  rules: {
    'no-unused-vars': 'off',
    'unused-imports/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'off',
  },
})
