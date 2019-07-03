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

logs:

```bash
{
        "xxx/test/src/index.vue": {
                "xxx/test/src/vue-dep.js": {},
                "xxx/test/src/import.css": {
                        "xxx/test/src/test.css": {
                                "xxx/test/src/import.css": {}
                        }
                }
        }
}


[ 
    'xxx/test/src/vue-dep.js',
    'xxx/test/src/import.css',
    'xxx/test/src/test.css' 
]
```

## Params

```
getDependencyTree({
        // required
        // should be an absolute path
        // entry file type supported for now: '.js' / '.vue' / '.css' / '.less' / '.sass' / '.scss'
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
        // like webpack resolve.alias
        // for example: alias: { '@test': 'haha' } --> require('@test/a') --> require('haha/a') --> get dep: 'haha/a'
    alias: Object,

        // not required
        // It is a result filter. The dependency will be in the result when it returns true
        // default:
            filterOut(dependencyFilePath, { isNodeModules, exists }) {
                if (isNodeModules) {
                    // This dependency is in node_modules
                    // This dependency will not be in the result
                    return true;
                }
        
                if (!exists) {
                    // This dependency does not exist
                    // This dependency will not be in the result
                    return true;
                }
        
                // This dependency will be in the result
                return false;
            },
        // 
    filterOut: Function,

        // not required
        // default: (absoluteFilePath) => {}
        // It's a callback when every dependency is found.
    onEveryDepFound: Function,

        // not required
        // default: (absoluteFilePath) => {}
        // It's a callback when filtered in dependency is found (These dependencies are not in the result).
    onFilteredInDepFound: Function,

        // not required
        // default: (absoluteFilePath) => {}
        // It's a callback when filtered out dependency is found (These dependencies are in the result).
    onFilteredInDepFound: Function,
});
```


## Return

```js
{ tree, arr }
```

+   `tree` is the dependency tree Object
+   `arr` is also dependencies showed by plain


