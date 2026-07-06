import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // The React Compiler is NOT enabled in this project's Vite build, so the
      // compiler's adoption-guidance diagnostics shipped in
      // eslint-plugin-react-hooks v7 are advisory rather than correctness
      // errors. They flag deliberate, working patterns (resetting state in an
      // effect guard branch; using `user?.id` as a memo dependency to avoid
      // re-running when the user object identity changes). Keep them visible as
      // warnings instead of failing CI. The classic, safety-critical rules
      // (rules-of-hooks, exhaustive-deps) and the render-purity/immutability
      // rules remain at their default severities.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
])
