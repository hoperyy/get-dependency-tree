const less = require('less');
const sass = require('sass');
const csstree = require('css-tree');
const babel = require('@babel/core');
const babelTraverse = require('@babel/traverse').default;
const vueTemplateCompiler = require('vue-template-compiler');

const fs = require('fs');
const path = require('path');
const isRelative = require('is-relative');

const utils = {
    // interface config
    autoCompleteExtentions: ['.js', '.vue', '.less', '.scss', '.sass', '.css'],
    globalEntry: '',
    searchRoot: '',
    alias: null,
    setFileCompiler: {
        '.js': 'js',
        '.vue': 'vue',
        '.less': 'less',
        '.scss': 'sass',
        '.sass': 'sass',
        '.css': 'css',
    },
    compilerSettings: {
        'js': {
            babelPlugins: ['@babel/plugin-syntax-dynamic-import', '@babel/plugin-transform-typescript']
        },
        'less': {

        },
        'sass': {

        },
        'css': {

        }
    },
    
    // filter
    filterOut({ depFilePath, isNodeModules, exists }) {
        if (isNodeModules) {
            return true;
        }

        if (!exists) {
            return true;
        }

        return false;
    },

    // callbacks
    onEveryDepFound(absoluteFilePath) {},
    onFilteredInDepFound(absoluteFilePath) {},
    onFilteredOutDepFound(absoluteFilePath) {},

    // node_modules tag
    nodeModulesFileMap: {},

    // not configed
    globalDeps: {},
    babelPresets: ['@babel/preset-env'],

    ensureExtname(filePath) {
        const autoCompleteExtentions = this.autoCompleteExtentions;
        const extname = path.extname(filePath);

        if (extname) {
            return filePath;
        }

        for (let i = 0, len = autoCompleteExtentions.length; i < len; i++) {
            const newPath = `${filePath}${autoCompleteExtentions[i]}`;

            if (fs.existsSync(newPath)) {
                return newPath;
            }
        }

        return filePath;
    },

    getAbsoluteOriginPathInJs(originPath, wrapperFilePath) {
        const folder = path.dirname(wrapperFilePath);

        if (isRelative(originPath)) {
            return this.hasRelativeDotTag(originPath) ? this.getAbsoluteNodeModulesFilePath(originPath, wrapperFilePath) : this.ensureExtname(path.join(folder, originPath));
        } else {
            return this.ensureExtname(originPath);
        }
    },

    getAbsoluteOriginPathInCss(originPath, wrapperFilePath) {
        const folder = path.dirname(wrapperFilePath);

        if (isRelative(originPath)) {
            return path.join(folder, originPath);
        } else {
            return originPath;
        }
    },

    hasRelativeDotTag(originPath) {
        return !/^(\.+)\//.test(originPath);
    },

    formatOriginByAlias(originPath) {
        if (!this.alias) {
            return originPath;
        }

        for (let key in this.alias) {
            if (originPath.indexOf(key) == 0) {
                return originPath.replace(key, this.alias[key]);
            }   
        }

        return originPath;
    },

    getAbsoluteNodeModulesFilePath(originPath, wrapperFilePath) {
        let curFolder = path.dirname(wrapperFilePath);
        const searchRoot = this.searchRoot;

        let rt = originPath;
        while (curFolder.indexOf(searchRoot) !== -1) {
            const absoluteOriginPath = path.join(curFolder, 'node_modules', originPath);

            if (fs.existsSync(absoluteOriginPath)) {
                rt = absoluteOriginPath;
                break;
            }

            curFolder = path.join(curFolder, '..');
        }

        // tag node_modules file
        this.nodeModulesFileMap[rt] = true;
        return rt;
    },

    checkPreventDep(absoluteOriginPath, deps) {
        let shouldPrevent = false;

        // callback
        this.onEveryDepFound && this.onEveryDepFound(absoluteOriginPath);

        // if won't show node_modules dep, return
        const filteredOut = this.filterOut({ 
            depFilePath: absoluteOriginPath,
            exists: fs.existsSync(absoluteOriginPath) && fs.statSync(absoluteOriginPath).isFile(),
            isNodeModules: this.nodeModulesFileMap[absoluteOriginPath]
        });

        if (filteredOut) {
            // callback
            this.onFilteredOutDepFound && this.onFilteredOutDepFound(absoluteOriginPath);
            shouldPrevent = true;
        } else {
            // callback
            this.onFilteredInDepFound && this.onFilteredInDepFound(absoluteOriginPath);
        }

        // prevent this pointer
        if (this.hasDuplicatedDep(absoluteOriginPath, deps)) {
            shouldPrevent = true;
        }

        return shouldPrevent;
    },

    walkTree(tree, pathArr, stop) {
        const keys = Object.keys(tree);
        let key;

        for (let i = 0, len = keys.length; i < len; i++) {
            key = keys[i];

            if (stop({ curDep: tree[key], key, pathArr }) === 'stop') {
                return;
            }

            this.walkTree(tree[key], pathArr.concat([key]), stop);
        }
    },

    hasDuplicatedDep(absoluteFilePath, deps) {
        let has = false;

        this.walkTree(this.globalDeps[this.globalEntry], [], ({ curDep, pathArr }) => {
            if (deps === curDep && pathArr.indexOf(absoluteFilePath) !== -1) {
                has = true;
                return 'stop';
            }

            // const keys = Object.keys(curDep);

            // if (keys.indexOf(absoluteFilePath) !== -1) {
            //     has = true;
            //     return 'stop';
            // }
        });

        return has;
    },

    // getDepPaths(dep) {
    //     const globalDeps = this.globalDeps;

    //     this.walkTree(globalDeps, ({ curDep }) => {
    //         if (curDep === dep) {

    //         }
    //     });
    // },
    
    traverseJsCode(jsCode, filePath, deps) {
        const { ast } = babel.transformSync(jsCode, { ast: true, plugins: this.compilerSettings['js'].babelPlugins, presets: this.babelPresets, filename: '.' });

        babelTraverse(ast, {
            // import a from 'a'
            // import 'a'
            ImportDeclaration: (path) => {
                const node = path.node;
                const originPath = this.formatOriginByAlias(node.source.value);
                const absoluteOriginPath = this.getAbsoluteOriginPathInJs(originPath, filePath);

                if (this.checkPreventDep(absoluteOriginPath, deps)) {
                    return;
                }

                this.ensureDep(deps, absoluteOriginPath);

                // won't analyze node_modules file dep
                if (this.nodeModulesFileMap[absoluteOriginPath]) {
                    return;
                }

                // 递归
                this.run(absoluteOriginPath, deps[absoluteOriginPath]);
            },
            // require('a')
            Identifier: (path) => {
                const node = path.node;
                
                if (node.name !== 'require' ) {
                    return;
                }

                if (path.parent.type !== 'CallExpression') {
                    return;
                }

                if (!path.parent.arguments.length) {
                    return;
                }

                if (path.parent.arguments[0].type === 'StringLiteral') {
                    const originPath = this.formatOriginByAlias(path.parent.arguments[0].value);
                    const absoluteOriginPath = this.getAbsoluteOriginPathInJs(originPath, filePath);

                    if (this.checkPreventDep(absoluteOriginPath, deps)) {
                        return;
                    }

                    this.ensureDep(deps, absoluteOriginPath);

                    // won't analyze node_modules file dep
                    if (this.nodeModulesFileMap[absoluteOriginPath]) {
                        return;
                    }

                    // 递归
                    this.run(absoluteOriginPath, deps[absoluteOriginPath]);
                }
            },

            // import('./haha.js');

            // import(() => './haha.js');

            // import(() => {
            //     return './haha.js'
            // });

            // import(function a() {
            //     return './haha.js'
            // });
            Import: (path) => {
                // ensure 'import(...)'  perhaps not nessesary
                if (path.parent.type !== 'CallExpression') {
                    return;
                }

                // mast has arguments
                if (!path.parent.arguments.length) {
                    return;
                }

                const firstArg = path.parent.arguments[0];

                // set originPath
                let originPath;

                switch (firstArg.type) {
                    // import('./haha.js');
                    case 'StringLiteral':
                        {
                            originPath = this.formatOriginByAlias(firstArg.value);
                        }
                        break;
                    case 'ArrowFunctionExpression':
                        {
                            const body = firstArg.body;

                            // import(() => './haha.js');
                            if (body.type === 'StringLiteral') {
                                originPath = this.formatOriginByAlias(firstArg.body.value);
                            }

                            // import(() => {
                            //     return './haha.js'
                            // });
                            if (body.type === 'BlockStatement') {
                                // loop body.body
                                for (let i = 0, len = body.body.length; i < len; i++) {
                                    const item = body.body[i];

                                    if (item.type === 'ReturnStatement') {
                                        if (item.argument.type === 'StringLiteral') {
                                            originPath = this.formatOriginByAlias(item.argument.value);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        break;
                    // import(function a() {
                    //     return './haha.js'
                    // });
                    case 'FunctionExpression':
                        {
                            const body = firstArg.body;
                            if (body.type === 'BlockStatement') {
                                // loop body.body
                                for (let i = 0, len = body.body.length; i < len; i++) {
                                    const item = body.body[i];

                                    if (item.type === 'ReturnStatement') {
                                        if (item.argument.type === 'StringLiteral') {
                                            originPath = this.formatOriginByAlias(item.argument.value);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        break;
                    default:
                        break;
                }

                if (!originPath) {
                    return;
                }

                const absoluteOriginPath = this.getAbsoluteOriginPathInJs(originPath, filePath);

                if (this.checkPreventDep(absoluteOriginPath, deps)) {
                    return;
                }

                this.ensureDep(deps, absoluteOriginPath);

                // won't analyze node_modules file dep
                if (this.nodeModulesFileMap[absoluteOriginPath]) {
                    return;
                }

                // 递归
                this.run(absoluteOriginPath, deps[absoluteOriginPath]);
            }

        });
    },

    traverseVueCode(vueCode, filePath, deps) {
        // vue-template-compier 解析出 template、script、styles 三部分
        const compileResult = vueTemplateCompiler.parseComponent(vueCode);

        // const scriptLang = compileResult.script.attrs.lang || 'js';
        const scriptContent = compileResult.script.content;

        if (scriptContent) {
            this.traverseJsCode(scriptContent, filePath, deps);
        }

        compileResult.styles.forEach(style => {
            const lang = style.attrs.lang || 'css';
            const styleContent = style.content;

            this.traverseStyleCode(styleContent, filePath, deps, lang);
        });
    },

    ensureDep(deps, absoluteFilePath) {
        if (!deps[absoluteFilePath]) {
            deps[absoluteFilePath] = {};
        }
    },

    walkCssAst(css, filePath, deps) {
        const ast = csstree.parse(css);

        const urls = [];
        csstree.walk(ast, (node) => {
            if (this.declaration !== null && node.type === 'Url') {

                let value = node.value.value;
                value = value.replace(/^\'/g, '').replace(/\'$/g, '').replace(/^\"/g, '').replace(/\"$/g, '');

                urls.push(value);
            }
        });

        urls.forEach(url => {
            const absoluteOriginPath = this.getAbsoluteOriginPathInCss(url, filePath);

            // prevent this pointer
            if (this.checkPreventDep(absoluteOriginPath, deps)) {
                return;
            }

            this.ensureDep(deps, absoluteOriginPath);

            // won't analyze node_modules file dep
            if (this.nodeModulesFileMap[absoluteOriginPath]) {
                return;
            }

            this.run(absoluteOriginPath, deps[absoluteOriginPath]);
        });
    },

    traverseStyleCode(styleCode, filePath, deps, lang) {
        if (lang === 'scss' || lang === 'sass') {
            sass.render({ data: styleCode }, (err, result) => {
                if (err) {
                    throw Error(`[get-dependency-tree] error in ${lang} rendering: ${JSON.stringify(err)}`);
                }

                const css = result.css.toString();
                this.walkCssAst(css, filePath, deps);
            });
            return;
        }

        if (lang === 'css') {
            this.walkCssAst(styleCode, filePath, deps);
            return;
        }

        if (lang === 'less') {
            less.render(styleCode, (err, result) => {
                if (err) {
                    throw Error(`[get-dependency-tree] error in ${lang} rendering: ${JSON.stringify(err)}`);
                }
                const css = result.css;

                this.walkCssAst(css, filePath, deps);
            });
            return;
        }

        throw Error(`[get-dependency-tree] style lang "${lang}" is not supported`);
    },

    run(entryFilePath, deps) {
        if (!fs.existsSync(entryFilePath)) {
            return;
        }

        if (!fs.statSync(entryFilePath).isFile()) {
            return;
        }

        const content = fs.readFileSync(entryFilePath, 'utf8');
        const extname = path.extname(entryFilePath);
        const type = this.setFileCompiler[extname];

        switch (type) {
            case 'js':
                this.traverseJsCode(content, entryFilePath, deps);
                break;
            case 'vue':
                this.traverseVueCode(content, entryFilePath, deps);
                break;
            case 'css':
                this.traverseStyleCode(content, entryFilePath, deps, 'css');
                break;
            case 'less':
                this.traverseStyleCode(content, entryFilePath, deps, 'less');
                break;
            case 'sass':
                this.traverseStyleCode(content, entryFilePath, deps, 'sass');
                break;
            default:
                console.log(`[get-dependency-tree] file type "${extname}" is not supported for now.`);
                break;
        }
    },
};



const getDependencyTree = ({ 
    entry = '',
    searchRoot = '',
    autoCompleteExtentions = null,
    compilerSettings = null,
    alias = null,
    filterOut = null,
    onEveryDepFound = null,
    onFilteredInDepFound = null,
    onFilteredOutDepFound = null,
    setFileCompiler = null,
    // babelPresets = null
}) => {
    // check
    if (!entry) {
        throw Error('[get-dependency-tree] param "entry" is required but none was passed in.');
    }

    if (!fs.existsSync(entry)) {
        throw Error(`[get-dependency-tree] "entry" file does not exist: ${entry}`);
    }

    if (!fs.statSync(entry).isFile()) {
        throw Error(`[get-dependency-tree] "entry" should be a file: ${entry}`);
    }

    if (isRelative(entry)) {
        throw Error(`[get-dependency-tree] "entry" should be an absolute path: ${entry}`);
    }

    // reset config
    utils.globalEntry = entry;

    autoCompleteExtentions && (utils.autoCompleteExtentions = autoCompleteExtentions);

    onEveryDepFound && (utils.onEveryDepFound = onEveryDepFound);
    onFilteredInDepFound && (utils.onFilteredInDepFound = onFilteredInDepFound);
    onFilteredOutDepFound && (utils.onFilteredOutDepFound = onFilteredOutDepFound);

    compilerSettings && (Object.assign(utils.compilerSettings, compilerSettings));

    setFileCompiler && (Object.assign(utils.setFileCompiler, setFileCompiler));

    alias && (utils.alias = alias);

    filterOut && (utils.filterOut = filterOut);

    searchRoot && (utils.searchRoot = searchRoot);

    if (!utils.searchRoot) {
        utils.searchRoot = path.dirname(utils.globalEntry);
    }

    if (isRelative(utils.searchRoot)) {
        throw Error(`[get-dependency-tree] "searchRoot" should be an absolute path: ${searchRoot}`);
    }

    // babelPresets && (utils.babelPresets = babelPresets);

    utils.globalDeps[entry] = {};

    // run
    utils.run(entry, utils.globalDeps[entry]);

    const result = {
        tree: utils.globalDeps,
        arr: (() => {
            const arr = [];

            utils.walkTree(utils.globalDeps[utils.globalEntry], [], ({ key }) => {
                arr.push(key);
            });

            return [...new Set(arr)];
        })()
    };
    
    return result;
};

module.exports = getDependencyTree;
