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

let paths = {
    scripts: {
        built: "public/js/build",
        src: "client/js/*.js"
    }
}

var app = {};
app.config = config;
app.temporaryUserInfo = TemporaryUserInfo;

// Get image handler
app.paintingHandler = paintingHandler(app);
console.log("Loading image from the database...")
app.paintingHandler.loadImageFromDatabase().then((image) => {
    console.log("Successfully loaded image from database.");
}).catch(err => {
    console.error("An error occurred while loading the image from the database.\nError: " + err);
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
    recaptcha.init(config.recaptcha.siteKey, config.recaptcha.secretKey);
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

mongoose.connect(config.database);

// Clean existing built JS
gulp.task('clean', () => del(['public/js/build']));

function swallowError(error) {
    console.error("An error occurred while trying to process JavaScript: " + error);
    this.emit("end");
}

// Process JavaScript
gulp.task('scripts', ['clean'], (cb) => {
    console.log("Processing JavaScript...");
    let t = gulp.src(paths.scripts.src)
    t = t.pipe(babel({ presets: ['es2015'] }));
    t = t.on("error", swallowError);
    if(!config.debug) t = t.pipe(uglify());
    t = t.on("error", swallowError);
    t = t.pipe(gulp.dest(paths.scripts.built));
    t = t.on("end", () => console.log("Finished processing JavaScript."));
    return t;
});

// Rerun the task when a file changes 
gulp.task('watch', () => gulp.watch(paths.scripts.src, ['scripts']));

gulp.task('default', ['watch', 'scripts']);
gulp.start(['watch', 'scripts'])

app.server.listen(config.port, config.onlyListenLocal ? "127.0.0.1" : null);
