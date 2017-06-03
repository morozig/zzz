const gulp = require('gulp');
const ts = require('gulp-typescript');
const mocha = require('gulp-mocha');
const connect = require('gulp-connect');
const path = require('path');
const del = require('del');
const fs = require('fs');
const phantomjs = require('phantomjs-prebuilt');
const babel = require('gulp-babel');
const os = require('os');
const sourcemaps = require('gulp-sourcemaps');
const spawn = require('child_process').spawn;
const jsdom = require('jsdom');
const nodeJquery = require("jquery");
const html = require('html');
const gulpWebpack = require('webpack-stream');
const webpackConfig = require('./webpack.config.js');
const webpack = require('webpack');
const glob = require('glob');

const paths = {
    pages: ['src/*.html'],
    icon: 'assets/icons/favicon.ico',
    testLibs: [
        'node_modules/mocha/mocha.js',
        'node_modules/mocha/mocha.css',
        'node_modules/jquery/dist/jquery.min.js'
    ],
    vendor: [
        'node_modules/pixi.js/bin/pixi.min.js'
    ]
};

const tsProject = ts.createProject('tsconfig.json');

gulp.task('clean', () => {
    return del(['build']);
});

gulp.task('ts -> es6', () => {
    return tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .js.pipe(sourcemaps.write('.', {
            //loadMaps concats paths in strange way so here we strip dirs
            mapSources: function(sourcePath) {
                return path.basename(sourcePath);
            }
        }))
        .pipe(gulp.dest('build'));
});

gulp.task('es6 -> es5', () => {
    return gulp.src('build/**/*.js')
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(babel({
            presets: ['es2015'],
            plugins: ['transform-runtime']
        }))
        .pipe(sourcemaps.write('.', {
            mapSources: function(sourcePath) {
                return sourcePath;
            },
            sourceRoot: '..'
        }))
        .pipe(gulp.dest('build'));
});

gulp.task('compile', gulp.series(
    'clean',
    'ts -> es6',
    'es6 -> es5'
));

gulp.task('copy-html-release', () => {
    return gulp.src(paths.pages.concat(paths.icon))
        .pipe(gulp.dest('build/release'));
});

gulp.task('copy-assets-release', () => {
    return gulp.src('assets/**', '!assets/icons/**')
        .pipe(gulp.dest('build/release/assets'));
});

gulp.task('copy-vendor-release', () => {
    return gulp.src(paths.vendor)
        .pipe(gulp.dest('build/release/vendor'));
});

gulp.task('webpack-app', () => {
    webpackConfig.module.rules[0].include = path.resolve(__dirname, "src");
    return gulp.src('src/index.tsx')
        .pipe(gulpWebpack(webpackConfig, webpack))
        .pipe(gulp.dest('build/release'));
});

gulp.task('prepare-release', gulp.series(
    'copy-html-release',
    'copy-assets-release',
    'copy-vendor-release',
    'webpack-app'
));

gulp.task('webpack-tests', () => {
    webpackConfig.module.rules[0].include = [
        path.resolve(__dirname, "test"),
        path.resolve(__dirname, "src")
    ];
    webpackConfig.entry = glob.sync('./test/browser/Test*.ts');
    webpackConfig.output.filename = 'all-tests.js';
    return gulp.src('src/main.ts')
        .pipe(gulpWebpack(webpackConfig, webpack))
        .pipe(gulp.dest('build/test/browser'));
});

gulp.task('copy-test-files', () => {
    return gulp.src('build/release/**')
        .pipe(gulp.dest('build/test/browser'));
});

gulp.task('copy-test-libs', () => {
    return gulp.src(paths.testLibs)
        .pipe(gulp.dest('build/test/browser/vendor'));
});

gulp.task('inject-mocha', (callback) => {
    jsdom.env({
        file: "src/index.html",
        done: (error, window) => {
            if (error) callback(error);
            const document = window.document;
            var $ = nodeJquery(window);
            $('title').after('<script src="vendor/mocha.js">');
            $('head').append('<script src="vendor/jquery.min.js">');
            $('head').append('<link rel="stylesheet" href="vendor/mocha.css">');
            $('body').append('<div id="mocha">');
            $('body').append('<script>mocha.setup("bdd");</script>');
            $('body').append('<script src="all-tests.js">');
            $('body').append('<script>mocha.run();</script>');

            const prettyHTML = html.prettyPrint(
                jsdom.serializeDocument(document)
            );
            
            fs.writeFile(
                'build/test/browser/index.html',
                prettyHTML,
                'utf8',
                callback
            );
        }
    });
});

gulp.task('prepare-browser-tests', gulp.series(
    'webpack-tests',
    'copy-test-files',
    'copy-test-libs',
    'inject-mocha'
));

gulp.task('mocha-node', () => {
    return gulp.src('build/test/node/Test*.js', {read: false})
        .pipe(mocha({}));
});

gulp.task('mocha-browser', (callback) => {
    connect.server({
        port: 3001,
        root: 'build/test/browser'
    });
    const args = [
        require.resolve('mocha-phantomjs-core'),
        'http://localhost:3001',
        'spec',
        JSON.stringify({ useColors: true })
    ];
    const phantomMocha = spawn(phantomjs.path, args);
    phantomMocha.stdout.on('data', (data) => {
        let text = data.toString('utf8');
        if (text.match(/Pixi/i)) return;
        if (process.platform === 'win32') text = text.replace('✓', '√');
        process.stdout.write(text);
    });
    phantomMocha.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
    });

    phantomMocha.on('close', (code) => {
        connect.serverClose();
        setTimeout(callback, 5, code);
    });
});

gulp.task('test', gulp.series(
    'compile',
    'mocha-node'
));

gulp.task('default', gulp.series(
    'compile',
    'mocha-node',
    'prepare-release'
    // 'prepare-browser-tests',
    // 'mocha-browser'
));

gulp.task('rebuild', gulp.series(
    'compile',
    'prepare-release'
));

gulp.task('connect', () => {
    connect.server({
        // port: 3001,
        port: 3000,
        // root: 'build/test/browser'
        root: 'build/release'
    });
});