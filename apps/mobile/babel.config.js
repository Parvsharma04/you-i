module.exports = function (api) {
  api.cache(true);
  return {
    // `jsxImportSource: 'nativewind'` + the separate `nativewind/babel` preset
    // are both required for NativeWind v4 — omitting either one compiles
    // fine but silently drops all className styling. Reanimated/worklets
    // support is auto-detected by babel-preset-expo (react-native-worklets
    // is installed), so no manual plugin is needed here.
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
