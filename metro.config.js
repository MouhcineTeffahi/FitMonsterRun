const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('glb');

// three@0.186 "main" (three.cjs) only does require('./three.module.js').
// That shim loads on web and crashes Hermes with "undefined is not a function"
// when Play pulls in @react-three/fiber. Always use the ESM build.
const threeEsm = path.resolve(__dirname, 'node_modules/three/build/three.module.js');

config.resolver.unstable_enablePackageExports = false;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return { type: 'sourceFile', filePath: threeEsm };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
