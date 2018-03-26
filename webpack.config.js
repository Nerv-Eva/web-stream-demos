const path = require('path');
require("babel-core/register");
require("babel-polyfill");

module.exports = {
    target: 'web',
    entry: ['babel-polyfill', './js/demo3.js'],
    output: {
        filename: 'demo3.js',
        path: path.resolve(__dirname, 'public')
    },
    module: {
        rules: [{
            test: /\.js$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
            query: {
                presets: ['env', 'stage-2']
            }
        }]
    }
};