
var gulp = require('gulp');
var runSequence = require('run-sequence');

var fs = require('fs');
var path = require('path');
var url = require('url');
var _ = require('lodash');
var async = require('async');
var request = require('request');
var del = require('del');
var vinylPaths = require('vinyl-paths');
var liveproxy = require('liveproxy');
var connect = require('gulp-connect');

var compass = require('gulp-compass'),
    rev = require('gulp-rev'),
    uglify = require('gulp-uglify'),
    minifyCss = require('gulp-minify-css'),
    minifyHtml = require('gulp-minify-html'),
    savefile = require('gulp-savefile'),
    webpack = require('gulp-webpack'),
    htmlrefs = require('gulp-htmlrefs'),
    zip = require('gulp-zip'),
    newer = require('gulp-newer'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),
    sass = require('gulp-ruby-sass');          //sass;

var configs = {
    // about site global
    name: 'alloyteam-simple-default',
    subModule: '/',
    cdnRoot: 'http://component.qq.com/',
    webServerRoot: 'http://component.qq.com/',

    // liveproxy
    liveproxy: 1,
    // 图片格式imgType: '*.{jpg,jpeg,png,bmp,gif,ttf,ico,htc}',
    imgType: '*.*',

    // compress related
    minifyHtml: 0,
    minifyImage: 0,

    // webpack
    webpack: {},

    // jb support
    JBSupport: 1,
    zip: 1,
    // zip 包路径配置
    zipConf: [],
    // zip 名称
    zipName: 'offline.zip',
    // 离线包黑名单 
    zipBlacklist: []
};

var _configs = {
    src: './src/',
    dist: './dist/',
    tmp: './.tmp/',
    deploy: './public/',
    offlineCache: './.offline/',
    cssRev: './.tmp/.cssrev/',
    jsRev: './.tmp/.jsrev/',
};

// overwrite configs
_.extend(configs, _configs, require('./project') || {});


// global vars
var src = configs.src,
    dist = configs.dist,
    tmp = configs.tmp,
    deploy = configs.deploy,
    offlineCache = configs.offlineCache;

// default src folder options
var opt = {
    cwd: src,
    base: src
};
var distOpt = {
    cwd: dist,
    base: dist
};

// dev watch mode
var isWatching = true;
var isWebpackInit = false;
// set default alloykit offline zip config
var globCdn = ['**/*.*', '!**/*.{html,ico}'];
var globWebServer = ['**/*.{html,ico}'];

/*===============================================
 * 离线包生成配置
 *===============================================*/
if (configs.zip && _.isEmpty(configs.zipConf)) {
    configs.zipConf = [{
        target: configs.cdnRoot,
        include: globCdn
    }, {
        target: configs.webServerRoot,
        include: globWebServer
    }];

    if (!_.isEmpty(configs.zipBlacklist)) {
        // prefix '!' to exclude
        _.map(configs.zipBlacklist, function(item) {
            return '!' + item;
        });
        // union
        _.each(configs.zipConf, function(item) {
            _.union(item.include, configs.zipBlacklist)
        });
    }
}
gulp.task('ak:prepare', function(cb) {
    var q = _.map(configs.zipConf, function(item) {
        return function(callback) {
            var urlObj = url.parse(item.target);
            var target = path.join(offlineCache, urlObj.hostname, urlObj.pathname);
            gulp.src(item.include, distOpt)
                .pipe(gulp.dest(target))
                .on('end', function() {
                    callback();
                });
        };
    });

    async.parallel(q, function(err, result) {
        cb(err, result);
    });
});

gulp.task('ak:zip', ['ak:prepare'], function() {
    return gulp.src('**/*.*', {
            cwd: offlineCache
        })
        .pipe(zip(configs.zipName))
        .pipe(gulp.dest(deploy + 'offline'));
});


/*===============================================
 * webpack页面资源配置
 *===============================================*/
function initWebpackConfig() {
    var _cdn = isWatching ? '' : configs.cdn;
    var _webpack = {
        // cache: false,
        output: {
            // entry point dist file name
            filename: '[name].js',
            // aysnc loading chunk file root
            publicPath: 'js/',
            chunkFilename: isWatching ? 'chunk-[id].js' : 'chunk-[id]-[hash:8].js'
        }
    };
    _.extend(configs.webpack, _webpack);
    if (isWatching) {
        //添加后面rulMap,默认不使用
        // configs.webpack.devtool = '#inline-source-map';
    } else {
        configs.webpack.output.publicPath = configs.cdn + _webpack.output.publicPath;
    }

    _webpack.module = {
        loaders: [{
            test: /\.hbs$/,
            loader: 'handlebars-loader'
        }, {
            test: /common\/.*\.(png|jpg)$/,
            loader: 'file2?name=' + _cdn + 'img/common/' + '[name]-[hash:8].[ext]'
        }, {
            test: /static\/.*\.(png|jpg)$/,
            loader: 'file2?name=' + _cdn + 'img/static/' + '[name].[ext]'
        }, {
            test: /\.css$/,
            loader: isWatching ? 'style/url!file?name=chunk-[name].[ext]' : 'style/url!file?name=chunk-[name]-[hash:8].[ext]'
        }]
    };

    // set webpack module loader
    configs.webpack.module = configs.webpack.module || {};
    configs.webpack.module.loaders = _webpack.module.loaders;

    isWebpackInit = true;
};

var customMinify = ['noop'];
var customJBFlow = ['noop'];
if (configs.minifyHtml) {
    customMinify.push('minifyHtml');
}
if (configs.minifyImage) {
    // customMinify.push('imagemin');
}
if (configs.JBSupport) {
    // customJBFlow.push('jb:prepare');
    customJBFlow.push('ak:zip');
}


/*===============================================
 * 开始构建
 *===============================================*/
console.log('start to build project [' + configs.name + ']...');

// 清理dist目录缓存
gulp.task('clean', function(cb) {
    del([dist, tmp, deploy, offlineCache], cb);
});

// 清除node_module,并解决window下文件路径过长的bug
gulp.task('cleanmod', function(cb) {
    del('./node_modules', cb);
});

// 清理临时目录缓存
gulp.task('cleanall', function(cb) {
    del([dist, tmp, deploy, offlineCache, './.sass-cache'], cb);
});

// copy js、html到dist
var things2copy = ['*.{html,ico}', 'html/*.*', 'libs/**/*.*', 'js/*.js', 'img/static/**/' + configs.imgType];
gulp.task('copy', function() {
    return gulp.src(things2copy, opt)
        .pipe(newer(dist))
        .pipe(gulp.dest(dist));
});

// copy and rev some images files [filename-md5.png style]
var image2copy = '{img/,img/common/}' + configs.imgType;
gulp.task('img-rev', function() {
    // img root 
    return gulp.src(image2copy, opt)
        .pipe(newer(dist))
        .pipe(rev())
        .pipe(gulp.dest(dist));
});

// 编译scss并自动合成雪碧图
var scss2compile = '**/*.scss';
gulp.task('compass', function() {
    var cssSrc = './src/css/**/*.scss',
        cssDst = './dist/css';

    return gulp.src(scss2compile, opt)
        .pipe(newer(dist))
        .pipe(compass({
            config_file: './config.rb',
            css: 'dist/css',
            sass: 'src/css',
            image: src + 'img/',
            generated_image: dist + 'img/sprite'
        }))
        .pipe(gulp.dest(dist));
});

// packer js using webpack
var js2webpack = src + 'js/**/*.js';
var tpl2webpack = src + 'tpl/**/*.*';

gulp.task('webpack', function() {
    !isWebpackInit && initWebpackConfig();
    return gulp.src(js2webpack)
        .pipe(webpack(configs.webpack))
        .pipe(gulp.dest(dist + 'js/'));
});

// minify js and generate reversion files
// stand alone cmd to make sure all js minified
gulp.task('uglify', ['webpack'], function() {
    return gulp.src(['{' + dist + ',tmp}/**/*.js', '!' + dist + 'js/chunk-*.js'])
        .pipe(uglify())
        .pipe(vinylPaths(del))
        .pipe(rev())
        .pipe(savefile())
        .pipe(rev.manifest())
        .pipe(gulp.dest(configs.jsRev))
});

// minify css and generate reversion files
// stand alone cmd to make sure all css minified
gulp.task('minifyCss', ['compass'], function() {
    return gulp.src(['{' + dist + ',tmp}/**/*.css', '!' + dist + 'js/chunk-*.css'])
        .pipe(minifyCss())
        .pipe(vinylPaths(del))
        .pipe(rev())
        .pipe(savefile())
        .pipe(rev.manifest())
        .pipe(gulp.dest(configs.cssRev))
});

// replace html/js/css reference resources to new md5 rev version
// inline js to html, or base64 to img
gulp.task('htmlrefs', function() {
    var mapping;

    var jsRev = configs.jsRev + 'rev-manifest.json';
    var cssRev = configs.cssRev + 'rev-manifest.json';
    if (fs.existsSync(jsRev) && fs.existsSync(cssRev)) {
        mapping = _.extend(
            require(jsRev),
            require(cssRev)
        );
    }

    var refOpt = {
        urlPrefix: configs.cdnRoot,
        scope: [dist],
        mapping: mapping
    };
    return gulp.src(dist + '**/*.html')
        .pipe(htmlrefs(refOpt))
        .pipe(gulp.dest(dist));
});

gulp.task('minifyHtml', function() {
    return gulp.src(src + '/html/*.html')
        .pipe(minifyHtml({
            empty: true
        }))
        .pipe(savefile());
});

gulp.task('noop', function(fn) {
    fn();
});

// support local replacement & livereload
gulp.task('liveproxy', function(cb) {
    if (configs.liveproxy) {
        liveproxy({
            config: './livefile.js'
        });
    }
    cb();
});

gulp.task('connect', function() {
  connect.server({
    root: './dist',
    livereload: true,
    port: 80
  });
});

gulp.task('watch:set', function() {
    isWatching = true;
});

gulp.task('watch', function() {
    gulp.watch(things2copy, opt, ['copy']);
    gulp.watch(image2copy, opt, ['img-rev']);
    gulp.watch(scss2compile, opt, ['compass']);
    gulp.watch(js2webpack, ['webpack']);
    gulp.watch(tpl2webpack, ['webpack']);
});

// 图片压缩处理
gulp.task('imageminify', function(){
    var imgSrc = './dist/img/*',
        imgDst = './dist/img/';
    gulp.src(imgSrc)
        .pipe(imagemin({
            progressive: true,
            optimizationLevel: 7,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        }))
        .pipe(gulp.dest(imgDst));
});

gulp.task('dev', function(fn) {
    runSequence(['clean', 'watch:set'], ['copy', 'img-rev', 'compass', 'webpack'], 'connect', 'watch', 'liveproxy', fn);
    setTimeout(function(){
        gulp.start('imageminify');
    }, 3000);
});

gulp.task('dist', function(fn) {
    runSequence(
        'clean', ['copy', 'img-rev', 'compass', 'webpack', 'uglify', 'minifyCss'],
        'htmlrefs',
        customMinify,
        customJBFlow,
        fn);
    setTimeout(function(){
        gulp.start('imageminify');
    }, 3000);
});

gulp.task('default', ['dev']);