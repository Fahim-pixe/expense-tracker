module.exports = function (api) {
  api.cache(true);
  
  let plugins = [
    "@babel/plugin-transform-private-methods",
    "@babel/plugin-transform-private-property-in-object",
    "react-native-worklets/plugin"
  ];

  return {
    presets: [
      [
        "babel-preset-expo", 
        { 
          jsxImportSource: "nativewind",
          unstable_transformProfile: "hermes-v0" 
        }
      ], 
      "nativewind/babel"
    ],
    plugins,
  };
};
