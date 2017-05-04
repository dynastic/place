const ResponseFactory = require("./util/ResponseFactory");
const config = require('./config/config');
const mongoose = require('mongoose');
const paintingHandler = require("./util/PaintingHandler");
const recaptcha = require('express-recaptcha');
const HTTPServer = require("./util/HTTPServer");
const WebsocketServer = require("./util/WebsocketServer");
const TemporaryUserInfo = require("./util/TemporaryUserInfo");
const gulp = require('gulp');
const uglify = require('gulp-uglify');
const babel = require('gulp-babel');
const del = require('del');
const pump = require('pump');
const ErrorTracker = require("./util/ErrorTracker");

let paths = {
    scripts: {
        built: "public/js/build",
        src: "client/js/*.js"
    }
}

var app = {};
app.loadConfig = () => {
    app.config = require('./config/config');
}
app.loadConfig();
app.temporaryUserInfo = TemporaryUserInfo;

// Setup error tracking
app.errorTracker = ErrorTracker(app);
app.reportError = app.errorTracker.reportError;
process.on('uncaughtException', function(err) {
    // Catch all uncaught exceptions and report them
    app.reportError(err);
});

// Get image handler
app.paintingHandler = paintingHandler(app);
console.log("Loading image from the database...")
app.paintingHandler.loadImageFromDatabase().then((image) => {
    console.log("Successfully loaded image from database.");
}).catch(err => {
    app.reportError("Error while loading the image from database: " + err);
})

app.responseFactory = ResponseFactory(app);

app.enableCaptcha = false;
if(typeof app.config.recaptcha !== 'undefined') {
    if(typeof app.config.recaptcha.siteKey !== 'undefined' && typeof app.config.recaptcha.secretKey !== 'undefined') {
        app.enableCaptcha = app.config.recaptcha.siteKey != "" && app.config.recaptcha.secretKey != "";
    }
}
if(app.enableCaptcha) {
    // Set up reCaptcha
    recaptcha.init(app.config.recaptcha.siteKey, app.config.recaptcha.secretKey);
    app.recaptcha = recaptcha;
}

app.adminMiddleware = (req, res, next) => {
    if(!req.user || !req.user.admin) return res.status(403).redirect("/?admindenied=1");
    next();
};

app.modMiddleware = (req, res, next) => {
    if(!req.user || !(req.user.admin || req.user.moderator)) return res.status(403).redirect("/?moddenied=1");
    next();
};

app.httpServer = new HTTPServer(app);
app.server = require('http').createServer(app.httpServer.server);
app.websocketServer = new WebsocketServer(app, app.server);

mongoose.connect(app.config.database);

// Clean existing built JS
gulp.task('clean', () => del(['public/js/build']));

function swallowError(error) {
    app.reportError("Error while processing JavaScript: " + error);
    this.emit("end");
}

// Process JavaScript
gulp.task('scripts', ['clean'], (cb) => {
    console.log("Processing JavaScript...");
    let t = gulp.src(paths.scripts.src)
    t = t.pipe(babel({ presets: ['es2015'] }));
    t = t.on("error", swallowError);
    if(!app.config.debug) t = t.pipe(uglify());
    t = t.on("error", swallowError);
    t = t.pipe(gulp.dest(paths.scripts.built));
    t = t.on("end", () => console.log("Finished processing JavaScript."));
    return t;
});

// Rerun the task when a file changes 
gulp.task('watch', () => gulp.watch(paths.scripts.src, ['scripts']));

gulp.task('default', ['watch', 'scripts']);
gulp.start(['watch', 'scripts'])

app.server.listen(app.config.port, app.config.onlyListenLocal ? "127.0.0.1" : null);
