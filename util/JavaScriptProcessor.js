const gulp = require("gulp");
const uglify = require("gulp-uglify");
const babel = require("gulp-babel");
const sourcemaps = require('gulp-sourcemaps');
const del = require("del");

class JavaScriptProcessor {
    constructor(app) {
        this.app = app;
        
        this.paths = {
            scripts: {
                built: "public/js/build",
                src: "client/js/*.js"
            }
        };

        var swallowError = function() {
            app.reportError("Error while processing JavaScript: " + error);
            this.emit("end");
        }

        // Clean existing built JavaScript
        gulp.task("clean", () => del([this.paths.scripts.built]));
        // Process JavaScript
        gulp.task("scripts", ["clean"], (cb) => {
            this.app.logger.info('Babel', "Processing JavaScript…");
            var t = gulp.src(this.paths.scripts.src);
            t = t.pipe(sourcemaps.init());
            t = t.pipe(babel({ presets: ["es2015"] }));
            t = t.on("error", this.swallowError);
            if(!this.app.config.debug) t = t.pipe(uglify());
            t = t.on("error", this.swallowError);
            t = t.pipe(sourcemaps.write('.'));
            t = t.pipe(gulp.dest(this.paths.scripts.built));
            t = t.on("end", () => this.app.logger.info('Babel', "Finished processing JavaScript."));
            return t;
        });
        this.watchJavaScript()
        gulp.task("default", ["watch", "scripts"]);
    }

    processJavaScript() {
        gulp.start(["watch", "scripts"]);
    }

    watchJavaScript() {
        // Rerun the task when a file changes 
        gulp.task("watch", () => gulp.watch(this.paths.scripts.src, ["scripts"]));
    }
}

JavaScriptProcessor.prototype = Object.create(JavaScriptProcessor.prototype);

module.exports = JavaScriptProcessor;