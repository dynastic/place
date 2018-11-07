const mongoose = require("mongoose");
mongoose.promise = global.Promise;
const recaptcha = require("express-recaptcha");
const readline = require("readline").createInterface({input: process.stdin, output: process.stdout});
const util = require("util");
const PaintingManager = require("./util/PaintingManager");
const HTTPServer = require("./util/HTTPServer");
const WebsocketServer = require("./util/WebsocketServer");
const ResponseFactory = require("./util/ResponseFactory");
const TemporaryUserInfo = require("./util/TemporaryUserInfo");
const LeaderboardManager = require("./util/LeaderboardManager");
const UserActivityManager = require("./util/UserActivityManager");
const ModuleManager = require("./util/ModuleManager");
const PixelNotificationManager = require("./util/PixelNotificationManager");
const JavaScriptProcessor = require("./util/JavaScriptProcessor");
const ChangelogManager = require("./util/ChangelogManager");
const User = require("./models/user"); // 引入了一个 User model
const fs = require("fs");
const path = require("path");
// 引入了一大堆文件和模块

var app = {};

app.logger = require('./util/logger');
// 日志工具？

// 载入配置
app.loadConfig = (path = "./config/config") => {
    delete require.cache[require.resolve(path)];
    var oldConfig = app.config;
    app.config = require(path);
    app.colours = [... new Set((app.config.colours || ["#FFFFFF", "#E4E4E4", "#888888", "#222222", "#FFA7D1", "#E50000", "#E59500", "#A06A42", "#E5D900", "#94E044", "#02BE01", "#00D3DD", "#0083C7", "#0000EA", "#CF6EE4", "#820080"]).map((c) => c.toUpperCase()))];
    if(!app.config.siteName) app.config.siteName = "Place";
    if(!app.config.enableChangelogs) app.config.enableChangelogs = true;
    if(!app.config.boardSize) app.config.boardSize = 1600; // default to 1600 if not specified in config
    if(oldConfig && (oldConfig.secret != app.config.secret || oldConfig.database != app.config.database || oldConfig.boardSize != app.config.boardSize)) {
        app.logger.log("Configuration", "We are stopping the Place server because the database URL, secret, and/or board image size has been changed, which will require restarting the entire server.");
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

app.pixelNotificationManager = new PixelNotificationManager(app); // 通知管理
app.changelogManager = new ChangelogManager(app); 

app.reportError = app.logger.capture;

// 模块管理？
app.moduleManager = new ModuleManager(app);
app.moduleManager.loadAll();

// Create .place-data folder
// 创建一个隐藏文件夹
app.dataFolder = path.resolve(__dirname, ".place-data");
if (!fs.existsSync(app.dataFolder)) fs.mkdirSync(app.dataFolder);

// Get image handler
app.paintingManager = PaintingManager(app);
app.logger.info('Startup', "Loading image from the database…");
app.paintingManager.loadImageFromDatabase().then((image) => {
    app.paintingManager.startTimer();
    app.logger.info('Startup', "Successfully loaded image from database.");
}).catch((err) => {
    app.logger.capture("Error while loading the image from database: " + err);
});

// 计分板管理？
app.leaderboardManager = LeaderboardManager(app);
app.userActivityController = UserActivityManager(app);

app.enableCaptcha = false;
if(typeof app.config.recaptcha !== "undefined") {
    if(typeof app.config.recaptcha.siteKey !== "undefined" && typeof app.config.recaptcha.secretKey !== "undefined") {
        app.enableCaptcha = app.config.recaptcha.siteKey != "" && app.config.recaptcha.secretKey != "";
    }
}
// 如果启动了验证码
if(app.enableCaptcha) {
    // Set up reCaptcha
    recaptcha.init(app.config.recaptcha.siteKey, app.config.recaptcha.secretKey);
    app.recaptcha = recaptcha;
}

// 后台管理中间层？
app.adminMiddleware = (req, res, next) => {
    if(!req.user || !req.user.admin) return res.status(403).redirect("/?admindenied=1");
    next();
};

app.modMiddleware = (req, res, next) => {
    if(!req.user || !(req.user.admin || req.user.moderator)) return res.status(403).redirect("/?moddenied=1");
    next();
};

// 重启服务器？
app.recreateServer = () => {
    app.httpServer = new HTTPServer(app);
    app.server = app.httpServer.httpServer;
    app.websocketServer = new WebsocketServer(app, app.server);
}
app.recreateServer();

// 链接 mongodb 数据库
mongoose.connect(process.env.DATABASE || app.config.database);

// 删除用户？
const handlePendingDeletions = () => {
    setInterval(() => {
        const now = new Date();
        // 检查删除时间是否 < now
        User.remove({ deletionDate: { $lte: now } }, function(err, result) {
            if (err) { console.error(err); return }
            if (result.n) app.logger.log('Deleter', `Deleted ${result.n} users.`);
        });
    }, 30 * Math.pow(10, 3));
}

// 如果联机上了就看看不要删除用户？
mongoose.connection.once('connected', () => {
    handlePendingDeletions();
});

// Process JS
app.javascriptProcessor = new JavaScriptProcessor(app);
app.javascriptProcessor.processJavaScript();

// 停止服务器
app.stopServer = () => {
    if(app.server.listening) {
        app.logger.log('Shutdown', "Closing server…")
        app.server.close();
        setImmediate(function() { app.server.emit("close"); });
    }
}

app.restartServer = () => {
    app.stopServer();
    app.server.listen(process.env.PORT || app.config.port, (process.env.ONLY_LISTEN_LOCAL ? process.env.ONLY_LISTEN_LOCAL === true : app.config.onlyListenLocal) ? "127.0.0.1" : null, null, () => {
        app.logger.log('Startup', `Started Place server on port ${app.config.port}${app.config.onlyListenLocal ? " (only listening locally)" : ""}.`);
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
readline.on('line', i => {
    try {
        var output = eval(i)
        output instanceof Promise
        ? output.then(a => {
            console.log('Promise Resolved')
            console.log(util.inspect(a, {depth: 0}))
        }).catch(e => {
            console.log('Promise Rejected')
            console.log(e.stack)
        })
        : output instanceof Object
            ? console.log(util.inspect(output, {depth: 0}))
            : console.log(output)
    } catch (err) {
        console.log(err.stack)
    }
})
