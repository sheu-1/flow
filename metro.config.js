const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for .cjs files
config.resolver.sourceExts.push('cjs');

// Add support for .mjs files
config.resolver.sourceExts.push('mjs');

// Bundle size optimizations
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    // Enable advanced minification
    mangle: {
      keep_fnames: true, // Keep function names for better debugging
    },
    output: {
      comments: false, // Remove comments
    },
    compress: {
      drop_console: false, // Keep console logs for debugging (set to true for production)
      drop_debugger: true,
      pure_funcs: ['console.log'], // Remove specific console methods in production
    },
  },
};

// Optimize resolver for faster builds
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
  alias: {
    // Add aliases for commonly used paths to reduce bundle size
    '@components': './src/components',
    '@services': './src/services',
    '@screens': './src/screens',
    '@utils': './src/utils',
    '@theme': './src/theme',
  },
};

// Enable tree shaking for better bundle optimization
config.transformer.enableBabelRCLookup = false;

module.exports = config;
