const getDependencyTree = require('../src/index');

const path = require('path');

const { tree, arr } = getDependencyTree({
    entry: path.join(__dirname, 'src/entry.ts'),
    searchRoot: path.join(__dirname, '../..'),
    alias: {
      '@getDep': 'getDepTest'  
    },
  setFileCompiler: {
        '.we': 'vue'
  },
  filterOut: () => false
});

console.log(JSON.stringify(tree, null, '\t'));

console.log(arr);