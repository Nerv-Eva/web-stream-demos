require('babel-core/register')({
    presets: ['env', 'stage-2']
});
require("babel-polyfill");
require("./server");