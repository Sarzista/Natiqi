const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Use react-native-svg-transformer for SVGs
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

// Treat .svg files as source, not assets
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts.push('svg');

module.exports = config;


