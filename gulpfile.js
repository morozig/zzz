const gulp = require('gulp');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const ts = require('gulp-typescript');
const mocha = require('gulp-mocha');
const connect = require('gulp-connect');
const path = require('path');
const glob = require('glob');
const del = require('del');
const fs = require('fs');
const phantomjs = require('phantomjs-prebuilt');
const babel = require('gulp-babel');
const os = require('os');
const sourcemaps = require('gulp-sourcemaps');
const spawn = require('child_process').spawn;
const jsdom = require('jsdom').jsdom;
const gulpTypings = require('gulp-typings');
const buffer = require('vinyl-buffer');
const tsify = require("tsify");

const paths = {
    pages: ['src/*.html'],
    mocha: [
        'node_modules/mocha/mocha.js',
        'node_modules/mocha/mocha.css'
    ],
    vendor: ['node_modules/pixi.js/bin/pixi.min.js']
};

const tsProject = ts.createProject('tsconfig.json');

gulp.task('typings', () => {
    return gulp.src("./typings.json")
        .pipe(gulpTypings()); 
});

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
            presets: ['es2015']
        }))
        .pipe(sourcemaps.write('.', {
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
    return gulp.src(paths.pages)
        .pipe(gulp.dest('build/release'));
});

gulp.task('copy-assets-release', () => {
    return gulp.src('assets/**')
        .pipe(gulp.dest('build/release/assets'));
});

gulp.task('copy-vendor-release', () => {
    return gulp.src(paths.vendor)
        .pipe(gulp.dest('build/release/vendor'));
});

gulp.task('browserify-app', () => {
    return browserify({
        basedir: '.',
        debug: true,
        entries: ['src/main.ts'],
        cache: {},
        packageCache: {}
    })
        .plugin(tsify)
        .transform('babelify', {
            presets: ['es2015'],
            extensions: ['.ts']
        })
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(sourcemaps.write('./', {
            sourceRoot: '../..'
        }))
        .pipe(gulp.dest('build/release'));
});

gulp.task('prepare-release', gulp.series(
    'copy-html-release',
    'copy-assets-release',
    'copy-vendor-release',
    'browserify-app'
));

gulp.task('browserify-tests', () => {
    const testFiles = glob.sync('test/browser/Test*.ts');
    return browserify({
        basedir: '.',
        debug: true,
        entries: testFiles,
        cache: {},
        packageCache: {}
    })
    .plugin(tsify)
    .transform('babelify', {
        presets: ['es2015'],
        extensions: ['.ts']
    })
    .bundle()
    .pipe(source('all-tests.js'))
    .pipe(gulp.dest('build/test/browser'));
});

gulp.task('copy-test-files', () => {
    return gulp.src(paths.mocha.concat('build/release/**'))
        .pipe(gulp.dest('build/test/browser'));
});

gulp.task('inject-mocha', (callback) => {
    fs.readFile('src/index.html', 'utf8', (err, text) => {
        if (err){
            callback(err);
            return;
        }
        const document = jsdom(text);
        const window = document.defaultView;

        const bundle = document.getElementById('bundle');
        let element = document.createElement('script');
        element.src = 'mocha.js';
        document.head.insertBefore(element, bundle);

        element = document.createElement('link');
        element.rel = 'stylesheet';
        element.href = 'mocha.css';
        document.head.appendChild(element);

        element = document.createElement('div');
        element.id = 'mocha';
        document.body.appendChild(element);

        element = document.createElement('script');
        element.innerHTML = 'mocha.setup("bdd")';
        document.body.appendChild(element);

        element = document.createElement('script');
        element.src = 'all-tests.js';
        document.body.appendChild(element);

        element = document.createElement('script');
        element.innerHTML = 'mocha.run();';
        document.body.appendChild(element);

        fs.writeFile(
            'build/test/browser/index.html',
            window.document.documentElement.outerHTML,
            'utf8',
            callback
        );
    });
});

gulp.task('prepare-browser-tests', gulp.series(
    'browserify-tests',
    'copy-test-files',
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

gulp.task('default', gulp.series(
    'typings',
    'compile',
    'mocha-node',
    'prepare-release',
    'prepare-browser-tests',
    'mocha-browser'
));

gulp.task('connect', () => {
    connect.server({
        // port: 3001,
        port: 3000,
        // root: 'build/test/browser'
        root: 'build/release'
    });
});