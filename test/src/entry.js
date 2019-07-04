const jquery = require('jquery');
const zepto = require('zepto');

import _ from 'lodash';
import bar from './sub/bar';
import bar1 from './sub/bar.1';

bar1();

import('@babel/core');

import 'getDepHahaha'

import './test.we'

import B from '@getDep/hi';

B();

import A from './index.vue';

import(() => './haha.js');

import(() => { 
    return './heihei.js'
});

import(function en () {
    return './hehe.js'
});

const a = 'a';
const b = 'b';

A();

_();

bar();

require(a + b);

function test() {
    require('underscore')()
}

function readImage(path: string, callback: (err: any, image: Image) => void) {
    // ...
}

readImage.sync = (path: string) => {
    const contents = fs.readFileSync(path);
    return decodeImageSync(contents);
}