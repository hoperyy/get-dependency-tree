# Introduction

`get-dependency-tree` will help you get `entry` file's dependency tree/arr.

# Usage

You can run `npm run test` or write code in your project yourself like this:

```bash
npm i get-dependency-tree
```

```js
const getDependencyTree = require('get-dependency-tree');
const path = require('path');

const { tree, arr } = require('get-dependency-tree')({
    entry: require('path').join(__dirname, 'test/src/index.vue'),
});

console.log(JSON.stringify(tree, null, '\t'));
console.log(arr);
```

## Params

```
getDependencyTree({
    // required
    // should be an absolute path
    entry: String,
    
    // not requried
    // should be an absolute path
    // It's the final root folder when finding dependencies.
    searchRoot: String,
    
    // not required
    // default: ['.js', '.vue', '.less', '.scss']
    // like webpack project: `require('a')` --> require('a.js')
    extentions: Array,
    
    // not required
    // default: [ '@babel/plugin-syntax-dynamic-import', '@babel/plugin-transform-typescript' ]
    // `get-dependency-tree` needs babel for compiling.
    // when you set it, it will override default value.
    babelPlugins: Array,
    
    // not required
    // default: null
    // like webpack resolve/alias
    // for example: alias: { '@test': 'haha' } --> require('@test/a') --> require('haha/a') --> get dep: 'haha/a'
    alias: Object
});
```
