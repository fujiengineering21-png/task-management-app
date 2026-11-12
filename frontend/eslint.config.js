import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      // 見た目の決まりは Prettier に任せる（ESLint の見た目の決まりと、ぶつからないようにする）
      prettier,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // テスト用の部品は、画面の部品ではない関数も書き出すので、この決まりは当てはめない
    files: ['src/test/**', 'src/**/*.test.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
