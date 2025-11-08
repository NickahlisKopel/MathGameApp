const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add node_modules polyfills for react-native-svg
config.resolver.alias = {
  ...config.resolver.alias,
  buffer: require.resolve('buffer'),
};

module.exports = config;