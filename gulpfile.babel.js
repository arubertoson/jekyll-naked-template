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
        all: [
            path.join(_dev, '**/vendors/**/*.*'),
            'bower_components'
        ],
        bower: {
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


/**
 * Clean the project dir from vendor plugins
 */
const clean = (done) => del(dirs.vendors.bower.all, done);


/**
 * Install third party packages from bower
 */
function install_bower_packages() {
    return gulp.src(dirs.vendors.bower.pkg)
        .pipe(install());
}


/**
 * As these are mainly scss files we're dealing with and our build environment
 * won't allow for third party pacakges tagging along we move the source files
 * to the dev map.
 *
 * NOTE: I am not confident this is the right solution.
 */
function move_bower_packages_to_dev() {
    return gulp.src(path.join(dirs.vendors.bower.src, '**/*.?(s)css'))
        .pipe(gulp.dest(path.join(dirs.sass.src, 'vendors')));
}


/**
 * Rename normalize.css to _normalize.scss which makes it importable
 * for sass main file.
 */
function normalize_to_scss() {
    var npath = path.join(dirs.sass.src,
                          'vendors',
                          'normalize.css');
    var nfile = path.join(npath, 'normalize.css');
    var stream = gulp.src(nfile)
        .pipe(rename('_normalize.scss'))
        .pipe(gulp.dest(npath));
    del(nfile);
    return stream;
}


/**
 * Perfom various optimizations to sass files.
 * 1. sass to css
 * 2. optimize css with clean-css
 */
function build_sass() {
    return gulp.src(dirs.sass.files)
        .pipe(sass().on('error', sass.logError))
        .pipe(cleanCSS())
        .pipe(gulp.dest(dirs.dep))
        .pipe(bsync_jekyll.stream());
}


/**
 * check if directory exists.
 */
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


/**
 * Optimize images for web.
 */
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


/**
 * Collection of build functions to run.
 */
const gulp_build = gulp.parallel(build_sass, build_images);


/**
 * Builds jekyll with additional flags for development, also logging.
 */
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


/**
 * Deployment build for jekyll.
 */
function build_jekyll() {
    gulp_build();
    return spawn('jekyll', [
        'build', '--trace'
    ]);
}


/**
 * Serve with browser-sync for automatic reload on file changes.
 */
function server_jekyll() {
    bsync_jekyll.init({
        server: {
            baseDir: "_site"
        }
    });
}


/**
 * Watch function to complement browser-sync and make sure to reload
 * when wanted changes occur.
 */
function watch(done) {
    gulp.watch(dirs.sass.src + "**/*.?(s)css", build_sass);
    gulp.watch(['_site/**/*.html']).on('change', bsync_jekyll.reload);
    done();
}


/**
 * Public API
 */
const bower = gulp.series(clean,
                          install_bower_packages,
                          move_bower_packages_to_dev,
                          normalize_to_scss);
const serve = gulp.parallel(build_jekyll, server_jekyll, watch);
const build = gulp.series(build_jekyll);


export {clean};
export {bower};
export {serve};
export {build};
