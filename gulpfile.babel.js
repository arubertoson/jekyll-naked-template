// gulpfile.js

// TODO: Babel lookup (how to specify standard etc.)

import os from 'os';
import path from 'path';

import gulp from 'gulp';
import sass from 'gulp-sass';
import open from 'gulp-open';
import gutil from 'gulp-util';
import rename from 'gulp-rename';
import concat from 'gulp-concat';
import uglify from 'gulp-uglify';
import connect from 'gulp-connect';
import install from 'gulp-install';
import imagemin from 'gulp-imagemin';
import cleanCSS from 'gulp-clean-css';

import del from 'del';
import spawn from 'cross-spawn';

const paths = {
    src: '_dev',
    depl: 'assets',

    vendors: {
        bower: {
            all: [
                path.join('_dev', '**/vendors/**/*.*'),
                'bower_components'
            ],
            package: 'bower.json',
            src: 'bower_components'
        },
        node: 'node_modules'
    },
    html: [
        '_includes/*.html',
        '_layouts/*.html',
        '*.html'
    ],
    md: [
        '_drafs/*.md',
        '_posts/*.md',
    ],
    images: {
        files: '_dev/images/**/*.{jpg,jpeg,png,gif}',
        src: '_dev/images/',
        dest: 'assets/images'
    },
    css: {
        files: '_dev/css/**/*.css',
        src: '_dev/css/',
        dest: 'assets/css'
    },
    scss: {
        files: '_dev/scss/main.scss',
        src: '_dev/scss/',
        dest: 'assets/css'
    },
    fonts: 'assets/fonts/*'
}


// Setup


const clean = (done) => del(paths.vendors.bower.all, done);
function getdeps() {
    return gulp.src(paths.vendors.bower.package)
        .pipe(install());
}

function move_scss_deps() {
    return gulp.src(path.join(paths.vendors.bower.src, '**/*.?(s)css'))
        // paths.vendors.bower.src + '**/*.?(s)css')
        .pipe(gulp.dest(path.join(paths.scss.src, 'vendors')));
}

function fix_normalize_dep() {
    var normalize_p = path.join(paths.scss.src,
                                'vendors',
                                'normalize.css');
    var normalize_f = path.join(normalize_p, 'normalize.css');
    var stream = gulp.src(normalize_f)
        .pipe(rename('_normalize.scss'))
        .pipe(gulp.dest(normalize_p));
    del(normalize_f);
    return stream;
}


// Tasks


function images() {
    return gulp.src(paths.images.dest, {since: gulp.lastRun(images)})
        .pipe(imagemin())
        .pipe(gulp.dest(paths.images.dest));
}

function html() {
    return gulp.src(paths.html, {since: gulp.lastRun(html)})
        .pipe(connect.reload());
}


function jekyll_dev(done) {
    const jekyll = spawn('jekyll', [
        'build',
        '--watch',
        '--incremental',
        '--drafts'
    ]);

    // logger
    const jekyll_logger = (buffer) => {
        buffer.toString()
            .split(/\n/)
            .forEach((message) => gutil.log('Jekyll: ' + message));
    };

    // proc IO
    jekyll.stdout.on('data', jekyll_logger);
    jekyll.stderr.on('data', jekyll_logger);
    done();
}

function jekyll() {
    return spawn('jekyll', [
        'build',
        '--trace'
    ]);
}


function connect_dev(done) {
    connect.server({
        root: '_site',
        port:8080,
        livereload: true
    });

    // gutil.log(connect.server.port);
    var browser = os.platform() === 'linux' ? 'google-chrome' : (
        os.platform() === 'darwin' ? 'google chrome' : (
            os.platform() === 'win32' ? 'chrome' : 'firefox'));
    gulp.src('./')
        .pipe(open({uri: 'http://localhost:8080', app: browser}));
    done();
}

// What happens when files are changed
// gulp.task('', () => {
//     gulp.src('./_scss/main.scss')
//         // .pipe($.plumber({errorHandler: errorAlert}))
//         .pipe(sass())
//         .pipe(clean_css())
//         // .pipe(concat('style.css'))
//         .pipe(gulp.dest('assets'));
// });

// What files to whatch
// gulp.task('watch', () => {
//     gulp.watch([
//         '*.html'
//     ], 'jekyll-build');
//     gulp.watch('_scss/**/*.scss', 'css_build');
//     gulp.watch('_site/**', connect.reload);
// })

// gulp.task('connect', function(done) {
//     connect.server({
//         root: '_site',
//         livereload: true
//     });
//     done();
// });


function watch(done) {
    // gulp.watch(['_site/**/*.*'], reload).pipe(connect.reload());
    gulp.watch(['_site/**/*.html']).on('change', connect.reload);
    done();
}

// Public API



const serve = gulp.parallel(jekyll_dev, connect_dev);//, watch);
const setup = gulp.series(clean,
                          getdeps,
                          move_scss_deps,
                          fix_normalize_dep);
export {clean};
export {setup};
export {serve};
