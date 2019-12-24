const getDependencyTree = require('../src/index');

const path = require('path');

const { tree, arr } = getDependencyTree({
    entry: path.join(__dirname, 'src/entry.ts'),
    searchRoot: path.join(__dirname, '../..'),
    alias: {
      '@getDep': 'getDepTest'  
    },
    setFileCompiler: {
      '.we': 'vue',
      '.tsx': 'js',
    },
    filterOut: () => false,
    // babelConfig: {
    //   plugins: [
    //     '@babel/plugin-proposal-class-properties',
    //     ['@babel/plugin-proposal-decorators', {
    //       decoratorsBeforeExport: true
    //     }],
    //     'module:@vdian/plugin-transform-typescript',
    //   ]
    // }
});

console.log(JSON.stringify(tree, null, '\t'));

console.log(arr);