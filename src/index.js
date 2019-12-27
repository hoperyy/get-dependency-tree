const babel = require('@babel/core');
const babelTraverse = require('@babel/traverse').default;

const fs = require('fs');
const path = require('path');
const isRelative = require('is-relative');

const getDependencyTree = ({
    entry = '',
    searchRoot = '',
    autoCompleteExtentions = null,
    babelConfig = null,
    alias = null,
    filterOut = null,
    onEveryDepFound = null,
    onFilteredInDepFound = null,
    onFilteredOutDepFound = null,
    setFileCompiler = null,
    resolveModules = [],
}) => {
    const utils = {
        // interface config
        autoCompleteExtentions: ['.js', '.vue', '.less', '.scss', '.sass', '.css'],
        globalEntry: '',
        searchRoot: '',
        alias: null,
        setFileCompiler: {
            '.js': 'js',
            '.ts': 'js',
            '.vue': 'vue',
            '.less': 'less',
            '.scss': 'sass',
            '.sass': 'sass',
            '.css': 'css',
        },
        babelConfig: {
            // plugins: ['@babel/plugin-syntax-dynamic-import', '@babel/plugin-transform-typescript', '@babel/plugin-proposal-class-properties'],
            // presets: ['@babel/preset-env']
            plugins: [],
            presets: [],
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

        resolveModules: [],

        // callbacks
        onEveryDepFound(absoluteFilePath) { },
        onFilteredInDepFound(absoluteFilePath) { },
        onFilteredOutDepFound(absoluteFilePath) { },

        // node_modules tag
        nodeModulesFileMap: {},

        // not configed
        globalDeps: {},

        ensureExtname(filePath) {
            const autoCompleteExtentions = this.autoCompleteExtentions;
            const extname = path.extname(filePath);

            if (extname && autoCompleteExtentions.indexOf(extname) !== -1) {
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
            const { ast } = babel.transformSync(jsCode, {
                ast: true,
                plugins: this.babelConfig.plugins,
                presets: this.babelConfig.presets,
                filename: '.',
                cwd: __dirname,
                babelrcRoots: '.',
            });

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

                    if (node.name !== 'require') {
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

        _getVueTemplateCompiler() {
            let finalPath = '';

            for (let i = 0, len = utils.resolveModules.length; i < len; i++) {
                const tmp = path.join(utils.resolveModules[i], 'vue-template-compiler');
                if (fs.existsSync(tmp)) {
                    finalPath = tmp;
                    break;
                }
            }

            return require(finalPath || 'vue-template-compiler');
        },

        traverseVueCode(vueCode, filePath, deps) {
            // vue-template-compier 解析出 template、script、styles 三部分
            // const compileResult = this._getVueTemplateCompiler().parseComponent(vueCode);
            let vueTemplateCompiler = null;

            try {
                vueTemplateCompiler = require('vue-template-compiler');
            } catch(err) {
                throw new Error('You need to install "vue-template-compiler" when using compiler: vue');
            }

            const compileResult = vueTemplateCompiler.parseComponent(vueCode);

            // const scriptLang = compileResult.script.attrs.lang || 'js';
            if (compileResult.script && compileResult.script.content) {
                this.traverseJsCode(compileResult.script.content, filePath, deps);
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

        traverseStyleCode(styleCode, filePath, deps, lang) {
            if (lang === 'scss' || lang === 'sass' || lang === 'less' || lang === 'css') {
                this.walkStyleContent(styleCode, filePath, deps);
                return;
            }

            throw Error(`[get-dependency-tree] style lang "${lang}" is not supported`);
        },

        walkStyleContent(content, filePath, deps) {
            if (deps[filePath]) {
                return;
            }

            this.ensureDep(deps, filePath);

            // analyze with reg
            let reliedFiles = [];

            {
                const reg = /\@import\s+(\'|\")(.+?)(\'|\")/ig; // @import 'import.css' @import "import.css"
                const arr = content.match(reg);

                if (arr) {
                    reliedFiles = reliedFiles.concat(arr.map(item => {
                        return item.replace(/^\@import\s+(\'|\")/ig, '').replace(/(\'|\")$/, '');
                    }));
                }
            }

            {
                const reg = /url\((\'|\")?.+?(\'|\")?\)/ig; // url('import.css')  url(import.css);
                const arr = content.match(reg);

                if (arr) {
                    reliedFiles = reliedFiles.concat(arr.map(item => {
                        return item.replace(/^url\((\'|\")?/ig, '').replace(/\)(\'|\")?$/, '');
                    }));
                }
            }

            const absoluteReliedFiles = reliedFiles.map(item => {
                if (isRelative(item)) {
                    return path.join(path.dirname(filePath), item);
                } else {
                    return item;
                }
            });

            absoluteReliedFiles.forEach(item => {
                if (fs.existsSync(item) && !this.checkPreventDep(item, deps)) {
                    this.ensureDep(deps[filePath], item, deps);
                    if (/\.(css|less|sass|scss)$/.test(item)) {
                        this.walkStyleContent(fs.readFileSync(item, 'utf8'), item, deps[filePath]);
                    }
                }
            });
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
            const compiler = this.setFileCompiler[extname];

            switch (compiler) {
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

    resolveModules && (utils.resolveModules = resolveModules);

    onEveryDepFound && (utils.onEveryDepFound = onEveryDepFound);
    onFilteredInDepFound && (utils.onFilteredInDepFound = onFilteredInDepFound);
    onFilteredOutDepFound && (utils.onFilteredOutDepFound = onFilteredOutDepFound);

    if (babelConfig) {
        if (babelConfig.plugins) {
            utils.babelConfig.plugins = babelConfig.plugins;
        }
        if (babelConfig.presets) {
            utils.babelConfig.presets = babelConfig.presets;
        }
    }

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
