const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;
