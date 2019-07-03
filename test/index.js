const getDependencyTree = require('../src/index');

const path = require('path');

const { tree, arr } = getDependencyTree({
    entry: path.join(__dirname, 'src/index.vue'),
    searchRoot: path.join(__dirname, '../..'),
    alias: {
      '@getDep': 'getDepTest'  
    },
    extentionProcessor: {
        '.we': 'vue'
    }
});

console.log(JSON.stringify(tree, null, '\t'));

console.log(arr);