// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*', 'supabase/.temp/*', 'supabase/functions/**'],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { Buffer: 'readonly', process: 'readonly', URL: 'readonly' },
    },
    rules: { 'no-console': 'off' },
  },
  {
    // A camada de domínio tem de permanecer independente de React/React Native.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-native', 'react-native/*', 'expo*', '@/ui/*', '@/features/*'],
            },
          ],
        },
      ],
    },
  },
  {
    // Interface e rotas só acedem a dados pelos repositórios exportados por `@/data`.
    files: ['src/app/**/*.{ts,tsx}', 'src/features/**/*.{ts,tsx}', 'src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['expo-sqlite', '@/data/db/*', '@/data/sqlite', '@/data/sqlite/*'],
              message: 'Usar os repositórios de `@/data`; SQL não entra na interface.',
            },
          ],
        },
      ],
    },
  },
]);
