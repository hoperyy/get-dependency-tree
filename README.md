# Introduction

`get-dependency-tree` will help you get `entry` file's dependency tree/arr.

# Usage

You can run `npm run test` or write code in your project yourself like this:

```bash
npm i get-dependency-tree
```

```js
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

```js
require('get-dependency-tree')({
    // ...
});
```

+   `entry: String | Required`
    +   default: `''`
    +   description

        It should be an absolute path
        
        entry file with extentions below is supported by default: `.js / .vue / .css / .less / .sass / .scss`.

+   `searchRoot: String | Not Required`
    +   default: `''`
    +   description

        It should be an absolute path.
        
        It's the final root folder when finding dependencies.

+   `setFileCompiler: Object | Not Required`

    +   default

        The file with extentions as left key is compiled by compilers as right value.

        4 types of value are supported for now: `js / vue / less / sass / css`.

        ```js
        {
            '.js': 'js',
            '.vue': 'vue',
            '.less': 'less',
            '.scss': 'sass',
            '.sass': 'sass',
            '.css': 'css',
        }
        ```

    +   description

        You can set which compiler(`js / vue / less / sass / css`) should compile the file with a extention.

        For example:

        When you set `setFileCompiler` as `{ '.we': 'vue' }`, `get-dependency-tree` will compile file with `.we` extention by compiler `vue`.
        
+   `autoCompleteExtentions: Array | Not Required`
    +   default: `['.js', '.vue', '.less', '.scss', '.sass', '.css']`
    +   description

        It's like webpack project: `require('a')` --> `require('a.js')`.

+   `compilerSettings: Object | Not Required`

    +   default

        ```js
        {
            'js': {
                babelPlugins: [
                    '@babel/plugin-syntax-dynamic-import',
                    '@babel/plugin-transform-typescript',
                    '@babel/plugin-proposal-class-properties'
                ]
            },
            'less': {

            },
            'sass': {

            },
            'css': {

            }
        }
        ```

    +   description

        It's compiler settings.

        +   `js`

            `get-dependency-tree` uses **babel** for analyzing. You can set babel plugins here by **override** the default settings.

        +   `less`

            `get-dependency-tree` uses **less.js render()** for compiling to less code.

        +   `sass`

            `get-dependency-tree` uses **sass render()** for analyzing.

        +   `css`

            `get-dependency-tree` uses **less.js render()** for compiling to css code.
        
+   `alias: Object | Not Required`
    +   default: `null`
    +   description

        It's like webpack config: `resolve.alias`
        
        For example: 
        
        ```js
        alias: { '@test': 'haha' }
        ``` 
        
        `require('@test/a') --> require('haha/a') --> get dep: 'haha/a'`
        
+   `filterOut: Function | Not Required`
    +   default

        ```js
        function filterOut({ depFilePath, isNodeModules, exists }) {
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
        }
        ```
        
    +   description

        It is a result filter.
        
        The dependency will be in the result when it returns `true`.
        
+   `onEveryDepFound: Function | Not Required`
    +   default

        ```js
        (absoluteFilePath) => {}
        ```
        
    +   description

        It will callback while every dependency is found.

+   `onFilteredInDepFound: Function | Not Required`
    +   default

        ```js
        (absoluteFilePath) => {}
        ```
        
    +   description

        It will callback while `filtered in` dependency is found (These dependencies are in the result).
        
+   `onFilteredOutDepFound: Function | Not Required`
    +   default

        ```js
        (absoluteFilePath) => {}
        ```
        
    +   description

        It will callback while `filtered out` dependency is found (These dependencies are not in the result).

## Return

```js
{ tree, arr }
```

+   `tree` is the dependency tree Object
+   `arr` is also dependencies showed by plain

## LICENSE

MIT