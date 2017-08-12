const mongoose = require("mongoose");
mongoose.promise = global.Promise;
const recaptcha = require("express-recaptcha");
const gulp = require("gulp");
const uglify = require("gulp-uglify");
const babel = require("gulp-babel");
const sourcemaps = require('gulp-sourcemaps');
const del = require("del");
const PaintingManager = require("./util/PaintingManager");
const HTTPServer = require("./util/HTTPServer");
const WebsocketServer = require("./util/WebsocketServer");
const ResponseFactory = require("./util/ResponseFactory");
const TemporaryUserInfo = require("./util/TemporaryUserInfo");
const LeaderboardManager = require("./util/LeaderboardManager");
const UserActivityManager = require("./util/UserActivityManager");
const ModuleManager = require("./util/ModuleManager");
const PixelNotificationManager = require("./util/PixelNotificationManager");

const paths = {
    scripts: {
        built: "public/js/build",
        src: "client/js/*.js"
    }
};

var app = {};

app.logger = require('./util/logger');

app.loadConfig = (path = "./config/config") => {
    delete require.cache[require.resolve(path)];
    var oldConfig = app.config;
    app.config = require(path);
    if(!app.config.boardSize) app.config.boardSize = 1400; // default to 1400 if not specified in config
    if(oldConfig && (oldConfig.secret != app.config.secret || oldConfig.database != app.config.database || oldConfig.boardSize != app.config.boardSize)) {
        app.logger.log("We are stopping the Place server because the database URL, secret, and/or board image size has been changed, which will require restarting the entire server.");
        process.exit(0);
    }
    if(oldConfig && (oldConfig.oauth != app.config.oauth)) {
        app.stopServer();
        app.recreateServer();
        app.restartServer();
        app.recreateRoutes();
    }
    if(oldConfig && (oldConfig.port != app.config.port || oldConfig.onlyListenLocal != app.config.onlyListenLocal)) app.restartServer();
}
app.loadConfig();
app.temporaryUserInfo = TemporaryUserInfo;
app.responseFactory = (req, res) => new ResponseFactory(app, req, res);

app.pixelNotificationManager = new PixelNotificationManager(app);

app.moduleManager = new ModuleManager(app);
app.moduleManager.loadAll();

app.reportError = app.logger.capture;

process.on("uncaughtException", (err) => {
    // Catch all uncaught exceptions and report them
    app.reportError(err);
});

// Get image handler
app.paintingManager = PaintingManager(app);
app.logger.info('STARTUP', "Loading image from the database…");
app.paintingManager.loadImageFromDatabase().then((image) => {
    app.paintingManager.startTimer();
    app.logger.info('STARTUP', "Successfully loaded image from database.");
}).catch((err) => {
    app.logger.capture("Error while loading the image from database: " + err);
});

app.leaderboardManager = LeaderboardManager(app);
app.userActivityController = UserActivityManager(app);

app.enableCaptcha = false;
if(typeof app.config.recaptcha !== "undefined") {
    if(typeof app.config.recaptcha.siteKey !== "undefined" && typeof app.config.recaptcha.secretKey !== "undefined") {
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

app.recreateServer = () => {
    app.httpServer = new HTTPServer(app);
    app.server = app.httpServer.httpServer;
    app.websocketServer = new WebsocketServer(app, app.server);
}
app.recreateServer();

mongoose.connect(app.config.database);

// Clean existing built JS
gulp.task("clean", () => del(["public/js/build"]));

function swallowError(error) {
    app.reportError("Error while processing JavaScript: " + error);
    this.emit("end");
}

// Process JavaScript
gulp.task("scripts", ["clean"], (cb) => {
    app.logger.info('BABEL', "Processing JavaScript…");
    var t = gulp.src(paths.scripts.src);
    t = t.pipe(sourcemaps.init());
    t = t.pipe(babel({ presets: ["es2015"] }));
    t = t.on("error", swallowError);
    if(!app.config.debug) t = t.pipe(uglify());
    t = t.on("error", swallowError);
    t = t.pipe(sourcemaps.write('.'));
    t = t.pipe(gulp.dest(paths.scripts.built));
    t = t.on("end", () => app.logger.info('BABEL', "Finished processing JavaScript."));
    return t;
});

// Rerun the task when a file changes 
gulp.task("watch", () => gulp.watch(paths.scripts.src, ["scripts"]));

gulp.task("default", ["watch", "scripts"]);
gulp.start(["watch", "scripts"]);

app.stopServer = () => {
    if(app.server.listening) {
        app.logger.log('SHUTDOWN', "Closing server...")
        app.server.close();
        setImmediate(function() { app.server.emit("close"); });
    }
}

app.restartServer = () => {
    app.stopServer();
    app.server.listen(app.config.port, app.config.onlyListenLocal ? "127.0.0.1" : null, null, () => {
        app.logger.log('STARTUP', `Started Place server on port ${app.config.port}${app.config.onlyListenLocal ? " (only listening locally)" : ""}.`);
    });
}
app.restartServer();
app.recreateRoutes = () => {
    app.moduleManager.fireWhenLoaded((manager) => {
        function initializeServer(directories, routes = []) {
            app.httpServer.setupRoutes(directories, routes);
        }
        function continueWithServer(directories = []) {
            manager.getRoutesToRegister().then((routes) => initializeServer(directories, routes)).catch((err) => app.logger.capture(err))//initializeServer(directories));
        }
        manager.getAllPublicDirectoriesToRegister().then((directories) => continueWithServer(directories)).catch((err) => continueWithServer());
    });
}
app.recreateRoutes();
