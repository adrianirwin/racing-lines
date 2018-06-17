const path = require('path');
const webpack = require('webpack');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

module.exports = {
	cache: false,
	mode: 'development',
	devtool: "source-map",
	entry: './source/main.js',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist')
	},
	module: {
		rules: [
			{
				test: /\.(s*)css$/,
				use: ['style-loader', 'css-loader', 'sass-loader']
			}
		]
	},
	plugins: [
		new HardSourceWebpackPlugin(),
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery'
		})
	]
};

	