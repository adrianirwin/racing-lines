const path = require('path');
const webpack = require('webpack');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const RemovePlugin = require('remove-files-webpack-plugin');

module.exports = {
	cache: false,
	mode: 'development',
	// mode: 'production',
	devtool: 'source-map',
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
			},
			{
				test: /\.js$/,
				include: [
					path.resolve(__dirname, "./source/workers")
				],
				use: { loader: 'worker-loader' }
			}
		]
	},
	plugins: [
		new HardSourceWebpackPlugin(),
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery'
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
	]
};