module.exports = {
    // 站点相关，项目名
    name: '移动开发组件',
    // 子模块名称
    subMoudle: '/',
    // webpack: js 模块化相关
    webpack: {
        entry: {
            // index: './src/js/index.js',
            component: './src/js/component.js',
            zepto: './src/js/lib/zepto.min.js',
            jquery: './src/js/lib/jquery.min.js'
        },
        output: {
            filename: '[name].js'
        }
    },
    // alloykit 离线相关
    zipBlacklist: [],
    // 使用 alloydist 发布离线包
    offline: {},
    distId: '',
    token: 'ASdxseRTSXfiGUIxnuRisTU'
};
