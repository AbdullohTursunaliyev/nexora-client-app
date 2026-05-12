/**
 * Jest config for service-layer (pure-logic) tests.
 *
 * Tests live under __tests__/ and import service modules directly. We do NOT
 * try to render React Native components here — that needs jest-expo + a much
 * heavier setup. Service tests mock lib/api/client.ts, so no native modules
 * are touched.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/worktrees'],
  setupFiles: ['<rootDir>/__tests__/__setup__/globals.ts'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__tests__/__mocks__/async-storage.ts',
    '^expo-secure-store$': '<rootDir>/__tests__/__mocks__/expo-secure-store.ts',
    '^react-native$': '<rootDir>/__tests__/__mocks__/react-native.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react', esModuleInterop: true } }],
  },
};
