const path = require('path');
const webpack = require('webpack');
const RemovePlugin = require('remove-files-webpack-plugin');

module.exports = {
	cache: false,
	mode: 'development',
	// mode: 'production',
	devtool: 'source-map',
	entry: './source/main.js',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist'),
	},
	module: {
		rules: [
			{
				test: /\.scss/,
				use: ['style-loader', 'css-loader', 'sass-loader'],
			},
		]
	},
	plugins: [
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
		}),
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
	],
	resolve: {
		alias: {
			'three': path.resolve('node_modules', 'three'),
		}
	},
};