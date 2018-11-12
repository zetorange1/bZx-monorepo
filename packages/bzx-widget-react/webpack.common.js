const webpack = require("webpack");

const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
  entry: {
    index: "./src/index.js"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bzx-widget-react.js",
    libraryTarget: "umd",
    umdNamedDefine: true,
    globalObject: `typeof self !== 'undefined' ? self : this`
  },
  module: {
    rules: [
      {
        test: [/\.js$/, /\.jsx$/],
        exclude: path.resolve(__dirname, "node_modules/"),
        loader: "babel-loader",
        query: {
          presets: ["react"]
        }
      },
      {
        test: /\.less$/,
        use: ["style-loader", "css-loader", { loader: "less-loader", options: { javascriptEnabled: true } }]
      }
    ]
  },
  resolve: {
    extensions: [".js", ".jsx"]
  },
  externals: [nodeExternals()] // in order to ignore all modules in node_modules folder from bundling
};
