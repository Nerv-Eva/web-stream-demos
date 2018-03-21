require('babel-core/register')({
    presets: [['env', {
        targets: {
            browsers: ["last 2 Chrome versions"]
        }
    }], 'stage-2']
});
require("babel-polyfill");
require("./build-es6");