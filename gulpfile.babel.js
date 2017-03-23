// gulpfile.js

import os from 'os';
import path from 'path';
import fs from 'fs';

import gulp from 'gulp';
import sass from 'gulp-sass';
import gutil from 'gulp-util';
import rename from 'gulp-rename';
import uglify from 'gulp-uglify';
import install from 'gulp-install';
import imagemin from 'gulp-imagemin';
import cleanCSS from 'gulp-clean-css';
import autoprefixCSS from 'gulp-autoprefixer';

import del from 'del';
import spawn from 'cross-spawn';
import browser_sync from 'browser-sync';

var bsync_jekyll = browser_sync.create('jekyll');

// TODO: path system is a mess
var _dev = '_dev';
var _dep = 'public';
const dirs = {
    src: _dev,
    dep: _dep,
    vendors: {
        bower: {
            all: [
                path.join(_dev, '**/vendors/**/*.*'),
                'bower_components'
            ],
            pkg: 'bower.json',
            src: 'bower_components'
        },
        node: {
            pkg: 'package.json',
            src: 'node_modules'
        }
    },
    html: {
        files: [
            '_includes/*.html',
            '_layouts/*.html',
            '*.html'
        ]
    },
    images: {
        files: path.join(_dev, 'images/**/*.{jpg,jpeg,png,gif}'),
        src: path.join(_dev, 'images'),
        dep: path.join(_dep, 'images')
    },
    sass: {
        files: path.join(_dev, 'scss', 'main.scss'),
        src: path.join(_dev, 'scss')
    },
    fonts: {
        src: path.join(_dep, 'fonts')
    }
}


// Setup


const clean = (done) => del(dirs.vendors.bower.all, done);
function getdeps() {
    return gulp.src(dirs.vendors.bower.pkg)
        .pipe(install());
}

function move_scss_deps() {
    return gulp.src(path.join(dirs.vendors.bower.src, '**/*.?(s)css'))
        .pipe(gulp.dest(path.join(dirs.scss.src, 'vendors')));
}

function fix_normalize_dep() {
    var normalize_p = path.join(dirs.scss.src,
                                'vendors',
                                'normalize.css');
    var normalize_f = path.join(normalize_p, 'normalize.css');
    var stream = gulp.src(normalize_f)
        .pipe(rename('_normalize.scss'))
        .pipe(gulp.dest(normalize_p));
    del(normalize_f);
    return stream;
}


// Build


function build_sass() {
    return gulp.src(dirs.sass.files)
        .pipe(sass().on('error', sass.logError))
        // .pipe(cleanCSS())
        .pipe(gulp.dest(dirs.dep));
        // .pipe(bsync_jekyll.stream());
}


function is_dir(test_path) {
    try {
        return fs.statSync(test_path).isDirectory();
    } catch(e) {
        if (e.code === 'ENOENT') {
            return false;
        } else {
            throw e;
        }
    }
}

function build_images(done) {
    if (!is_dir(dirs.images.dep)) {
        gutil. log('Image directory does not exists... skipping image build.');
        done();
    } else {
        return gulp.src(dirs.images.dep, {since: gulp.lastRun(build_images)})
            .pipe(imagemin())
            .pipe(gulp.dest(dirs.images.dep));
    }
}


const gulp_build = gulp.parallel(build_sass, build_images);


function build_jekyll_dev(done) {
    gulp_build();
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

function build_jekyll() {
    gulp_build();
    return spawn('jekyll', [
        'build', '--trace'
    ]);
}




// Utils


function server_jekyll() {
    bsync_jekyll.init({
        server: {
            baseDir: "_site"
        }
    });
}

function watch(done) {
    gulp.watch(dirs.sass.src + "**/*.?(s)css", build_sass);
    gulp.watch(['_site/**/*.html']).on('change', bsync_jekyll.reload);
    done();
}


// Public API


const setup = gulp.series(clean,
                          getdeps,
                          move_scss_deps,
                          fix_normalize_dep);
const serve = gulp.parallel(build_jekyll, server_jekyll, watch);
const build = gulp.series(build_jekyll);


export {clean};
export {setup};
export {serve};
export {build};
