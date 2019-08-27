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

        The file with extentions as left **key** is compiled by compilers as right **value**.

        5 compilers are supported for now: `js / vue / less / sass / css`.

        ```js
        {
            '.js': 'js', // file with extname `.js` will be compiled by compiler `js`
            '.vue': 'vue', // file with extname `.vue` will be compiled by compiler `vue`
            '.less': 'less', // file with extname `.less` will be compiled by compiler `less`
            '.scss': 'sass', // file with extname `.scss` will be compiled by compiler `sass`
            '.sass': 'sass', // file with extname `.sass` will be compiled by compiler `sass`
            '.css': 'css', // file with extname `.css` will be compiled by compiler `css`
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

+   `resolveModules: Array | Not Required`
    +   default: `[]`
    +   description

        It's like webpack project: `resolve: modules: []`.

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

            `get-dependency-tree` uses **babel** for analyzing. You can set `babelPlugins` here by **override** the default settings.

            >   Unfortunately, `babelPresets` is not allowed here because `babel.transform` won't read config `presets` somehow for now when testing.

        +   `less`

            `get-dependency-tree` uses **less.js render()** for analyzing.

        +   `sass`

            `get-dependency-tree` uses **sass render()** for analyzing.

        +   `css`

            `get-dependency-tree` uses **less.js render()** for analyzing.
        
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