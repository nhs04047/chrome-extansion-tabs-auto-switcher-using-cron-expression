const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

var fileExtensions = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "eot",
  "otf",
  "svg",
  "ttf",
  "woff",
  "woff2",
];

module.exports = {
  mode: "none",
  entry: {
    popup: path.join(__dirname, "src", "js", "popup.js"),
    background: path.join(__dirname, "src", "js", "background.js"),
  },
  output: {
    path: path.join(__dirname, "build"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
        exclude: /node_modules/,
      },
      {
        test: new RegExp(".(" + fileExtensions.join("|") + ")$"),
        loader: "file-loader",
        options: {
          name: "name=[name].[ext]",
        },
        exclude: /node_modules/,
      },
      {
        test: /\.html$/,
        use: ["html-loader"],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    fallback: {
      path: require.resolve("path-browserify"),
      child_process: false,
    },
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(__dirname, "src", "img"),
          to: path.join(__dirname, "build", "img"),
        },
        {
          from: "src/manifest.json",
          transform(content) {
            // generates the manifest file using the package.json informations
            return Buffer.from(
              JSON.stringify({
                description: process.env.npm_package_description,
                version: process.env.npm_package_version,
                ...JSON.parse(content.toString()),
              })
            );
          },
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "popup.html"),
      filename: "popup.html",
      chunks: ["popup"],
    }),
  ],
};
