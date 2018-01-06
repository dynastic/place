const gulp = require("gulp");
const uglify = require("gulp-uglify");
const babel = require("gulp-babel");
const sourcemaps = require('gulp-sourcemaps');
const changed = require('gulp-changed');
const del = require("del");

const swPrecache = require("sw-precache");
const path = require("path");

class JavaScriptProcessor {
    constructor(app) {
        this.app = app;
        
        this.paths = {
            scripts: {
                built: "public/js/build",
                src: "client/js/*.js"
            }
        };

        var swallowError = function(error) {
            app.reportError("Error while processing JavaScript: " + error);
            this.emit("end");
        }

        // Clean existing built JavaScript
        gulp.task("clean", () => del([this.paths.scripts.built]));
        // Rerun the task when a file changes 
        gulp.task("watch", () => gulp.watch(this.paths.scripts.src, ["scripts", 'generate-service-worker']));
        // Process JavaScript
        gulp.task("scripts", (cb) => {
            this.app.logger.info('Babel', "Processing JavaScript…");
            var t = gulp.src(this.paths.scripts.src);
            t = t.pipe(changed(this.paths.scripts.built))
            t = t.pipe(sourcemaps.init());
            t = t.pipe(babel({ presets: ["es2015", "es2016", "es2017"] }));
            t = t.on("error", swallowError);
            if(!this.app.config.debug) t = t.pipe(uglify());
            t = t.on("error", swallowError);
            t = t.pipe(sourcemaps.write('.'));
            t = t.pipe(gulp.dest(this.paths.scripts.built));
            t = t.on("end", () => this.app.logger.info('Babel', "Finished processing JavaScript."));
            return t;
        });
        // Generate the caching service-worker
        gulp.task('generate-service-worker', function(callback) {
            const appDir = path.join(__dirname, '..', 'public');
            console.log("generating shit");
            swPrecache.write(path.join(appDir, 'sw.js'), {
                staticFileGlobs: [appDir + '/**/*.{js,css,png,jpg,gif}'],
                stripPrefix: appDir,
                ignoreUrlParametersMatching: [/./]
            }, callback);
        });
        this.watchJavaScript()
        gulp.task("default", ["watch", "scripts"]);
    }

    processJavaScript() {
        gulp.start(["scripts", "generate-service-worker"]);
    }

    cleanJavaScript() {
        gulp.start(["clean"]);
    }

    watchJavaScript() {
        gulp.start(["watch"]);
    }
}

JavaScriptProcessor.prototype = Object.create(JavaScriptProcessor.prototype);

module.exports = JavaScriptProcessor;