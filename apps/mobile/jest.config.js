const reactNativePreset = require('@react-native/jest-preset');

module.exports = {
  ...reactNativePreset,
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/.pnpm/(?!(react-native|@react-native\\+[^@]+|@react-native-community\\+[^@]+|@react-navigation\\+[^@]+|react-native-keychain|react-native-safe-area-context|react-native-screens)@)',
    'node_modules/(?!(\\.pnpm|(jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-keychain|react-native-safe-area-context|react-native-screens)/)',
  ],
};
