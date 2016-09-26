const gulp = require('gulp');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const tsify = require('tsify');
const ts = require('gulp-typescript');
const mocha = require('gulp-mocha');
var paths = {
    pages: ['src/*.html']
};

gulp.task('copy-html', () => {
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
    .pipe(gulp.dest('build/release'));
});


gulp.task('tsc', ['bundle'], () => {
    gulp.src('src/**/*.ts')
        .pipe(ts({})).js
        .pipe(gulp.dest('build/src'));
    return gulp.src('test/**/*.ts')
        .pipe(ts({})).js
        .pipe(gulp.dest('build/test'));
});

gulp.task('mocha', ['tsc'], () => {
    return gulp.src('build/test/node/test-greet.js', {read: false})
        .pipe(mocha({}));
});

gulp.task('default', ['mocha']);