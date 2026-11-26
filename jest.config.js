// Jest config: jest-expo preset handles React Native + Expo transforms.
// DB tests use node:sqlite (Node 24 built-in) through a small adapter in
// tests/dbAdapter.ts so the exact same SQL runs against a real SQLite engine.
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/tests/**/*.test.ts?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|zustand)',
  ],
};
