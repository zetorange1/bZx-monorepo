const webpack = require("webpack");
const merge = require("webpack-merge");

const common = require("./webpack.common.js");

const devConfig = {
  mode: "development",
  devtool: "source-map"
};

module.exports = merge(common, devConfig);
