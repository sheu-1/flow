const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver to mock react-native-localize
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.alias = {
  'react-native-localize': require.resolve('./src/mocks/react-native-localize.js'),
  'react-native-localize/native': require.resolve('./src/mocks/react-native-localize.js'),
  'expo-localization': require.resolve('./src/mocks/expo-localization.js'),
  'expo-localization/native': require.resolve('./src/mocks/expo-localization.js'),
};

module.exports = config;
