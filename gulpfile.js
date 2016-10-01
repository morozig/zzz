const gulp = require('gulp');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const tsify = require('tsify');
const ts = require('gulp-typescript');
const mocha = require('gulp-mocha');
const connect = require('gulp-connect');
const spawn = require('child_process').spawn;
const path = require('path');
const glob = require('glob');
const del = require('del');
const jsdom = require("jsdom").jsdom;
const fs = require("fs");

const phantomjsBin = path.join(
    'node_modules',
    '.bin',
    'mocha-phantomjs'
);

const paths = {
    pages: ['src/*.html'],
    mocha: [
        'node_modules/mocha/mocha.js',
        'node_modules/mocha/mocha.css'
    ]
};

gulp.task('clean', () => {
    return del(['build']);
});

gulp.task('copy-html', ['clean'], () => {
    return gulp.src(paths.pages)
        .pipe(gulp.dest('build/release'));
});

gulp.task('bundle', ['copy-html'], () => {
    return browserify({
        basedir: '.',
        debug: true,
        entries: ['src/main.ts'],
        cache: {},
        packageCache: {}
    })
        .plugin(tsify)
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(gulp.dest('build/release'))
        .pipe(gulp.dest('build/test/browser'));
});


gulp.task('tsc', ['bundle'], () => {
    gulp.src('src/**/*.ts')
        .pipe(ts({})).js
        .pipe(gulp.dest('build/src'));
    return gulp.src('test/node/*.ts')
        .pipe(ts({})).js
        .pipe(gulp.dest('build/test/node'));
});

gulp.task('mocha-node', ['tsc'], () => {
    return gulp.src('build/test/node/test-greet.js', {read: false})
        .pipe(mocha({}));
});

gulp.task('browserify-tests', ['mocha-node'], () => {
    var testFiles = glob.sync("test/browser/test-*.ts");
    return browserify({
        basedir: '.',
        debug: true,
        entries: testFiles,
        cache: {},
        packageCache: {}
    })
    .plugin(tsify)
    .bundle()
    .pipe(source('all-tests.js'))
    .pipe(gulp.dest('build/test/browser'));
});

gulp.task('copy-mocha-browser', ['browserify-tests'], () => {
    return gulp.src(paths.mocha)
        .pipe(gulp.dest('build/test/browser'));
});

gulp.task('add-mocha', ['copy-mocha-browser'], (callback) => {
    fs.readFile('src/index.html', 'utf8', (err, text) => {
        const document = jsdom(text);
        const window = document.defaultView;

        let element = document.createElement('link');
        element.rel = 'stylesheet';
        element.href = 'mocha.css';
        document.head.appendChild(element);

        element = document.createElement('div');
        element.id = 'mocha';
        document.body.appendChild(element);

        element = document.createElement('script');
        element.src = 'mocha.js';
        document.body.appendChild(element);

        element = document.createElement('script');
        element.innerHTML = "mocha.setup('bdd')";
        document.body.appendChild(element);

        element = document.createElement('script');
        element.src = 'all-tests.js';
        document.body.appendChild(element);

        element = document.createElement('script');
        element.innerHTML = 'mocha.run();';
        document.body.appendChild(element);

        // console.log(window.document.documentElement.outerHTML);
        fs.writeFile(
            'build/test/browser/index.html',
            window.document.documentElement.outerHTML,
            'utf8',
            callback
        );
    });
});

gulp.task('mocha-browser', ['add-mocha'], (callback) => {
    connect.server({
        port: 3000,
        root: 'build/test/browser'
    });
    const phantomjs = spawn(
        phantomjsBin,
        ['http://localhost:3000'],
        { shell: true }
    );
    phantomjs.stdout.on('data', (data) => {
        process.stdout.write(`${data}`);
    });
    phantomjs.stderr.on('data', (data) => {
        process.stdout.write(`${data}`);
    });
    phantomjs.on('close', () => {
        connect.serverClose();
        setTimeout(callback, 5);
    });
});

gulp.task('default', ['mocha-browser']);

gulp.task('connect', () => {
    connect.server({
        port: 3000,
        root: 'build/test/browser'
        // root: 'build/release'
    });
});