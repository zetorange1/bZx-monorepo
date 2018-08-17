const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
  entry: "./src/core/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bzx.js",
    library: "bzx.js",
    libraryTarget: "umd"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: path.resolve(__dirname, 'node_modules/'),
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
  externals: [nodeExternals()], // in order to ignore all modules in node_modules folder from bundling
};
