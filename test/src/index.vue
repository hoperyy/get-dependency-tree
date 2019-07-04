<template>
    <div></div>
</template>

<script lang="ts">
import dep from './vue-dep';

dep();

export default {
    
}
</script>

<style lang="less">
@import 'import3.css';
@import 'import.css';
@import url('import2.css');
@import (css) "filename";
@example '1' 2;
.foo { background: url(README.md); }
.bar { background-image: url(../bar.png); }
</style>
