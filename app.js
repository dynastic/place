const responseFactory = require("./util/ResponseFactory");
const config = require('./config/config');
const mongoose = require('mongoose');
const paintingHandler = require("./util/PaintingHandler");
const recaptcha = require('express-recaptcha');
const HTTPServer = require("./util/HTTPServer.js");
const WebsocketServer = require("./util/WebsocketServer.js");
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

// Get image handler
app.paintingHandler = paintingHandler(app);
console.log("Loading image from the database...")
app.paintingHandler.loadImageFromDatabase().then((image) => {
    console.log("Successfully loaded image from database.");
}).catch(err => {
    console.error("An error occurred while loading the image from the database.\nError: " + err);
})

app.responseFactory = responseFactory;

// Set up reCaptcha
recaptcha.init(config.recaptcha.siteKey, config.recaptcha.secretKey);
app.recaptcha = recaptcha;

app.httpServer = new HTTPServer(app);
app.server = require('http').createServer(app.httpServer.server);
app.websocketServer = new WebsocketServer(app, app.server);

mongoose.connect(config.database);

// Clean existing built JS
gulp.task('clean', function() {
    return del(['public/js/build']);
});

// Process JavaScript
gulp.task('scripts', ['clean'], (cb) => {
    console.log("Processing JavaScript...");
    let t = gulp.src(paths.scripts.src)
    t = t.pipe(babel({
        presets: ['es2015']
    }))
    if(!config.debug) t = t.pipe(uglify());
    t.pipe(gulp.dest(paths.scripts.built));
    return t;
});

// Rerun the task when a file changes 
gulp.task('watch', () => {
    gulp.watch(paths.scripts.src, ['scripts']);
});

gulp.task('default', ['watch', 'scripts']);
gulp.start(['watch', 'scripts'])

app.server.listen(config.port, config.onlyListenLocal ? "127.0.0.1" : null);
