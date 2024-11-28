const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require("copy-webpack-plugin");
const RemovePlugin = require('remove-files-webpack-plugin');

module.exports = {
	cache: false,
	mode: 'development',
	// mode: 'production',
	devtool: 'source-map',
	entry: './ts/source/main.js',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist'),
	},
	module: {
		rules: [
			{
				test: /\.scss/,
				use: ['style-loader', 'css-loader', 'sass-loader'],
				include: [
					path.resolve(__dirname, './ts/source/styles' ),
				]
			},
		]
	},
	plugins: [
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
		}),
		new CopyPlugin({
			patterns: [
				{ from: './source/styles/', to: './../ts/source/styles/' }
			],
		})
		,
		new RemovePlugin({
			before: {
				allowRootAndOutside: true,
				root: __dirname,
				test: [
					{
						folder: 'dist',
						method: (filePath) => {
							return new RegExp(/worker\.js(\.map)?$/, 'igm').test(filePath);
						}
					}
				]
			}
		})
	]
};