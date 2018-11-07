const express = require("express");
const passport = require("passport");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const csurf = require("csurf");
const User = require("../models/user");
const session = require("cookie-session");
const fs = require("fs");
const path = require("path");

// 这里导入了 express
// 这里各种 server.use() 语法是什么意思？ https://expressjs.com/en/4x/api.html#app.use
// 中间层，如果 url 满足标准就会执行

// 函数传入了 app
function HTTPServer(app) {
    var server = express();
    var httpServer = require("http").createServer(server);
    
    // Setup for parameters and bodies
    server.use(bodyParser.urlencoded({extended: false}));
    server.use(bodyParser.json());
    
    server.use(helmet());

    // Set rendering engine
    // 设置渲染引擎 pug
    server.set("view engine", "pug");

    var setupRoutes = function(directories, modulesWithRoutes) {
        // Use public folder for resources
        // 静态资源
        server.use(express.static("public"));
        // Register module public directories
        directories.forEach((dir) => server.use(dir.root, dir.middleware));
        
        // Log to console
        // 取决于是不是 debug 模式，把 log 输出到不同地方
        if (app.config.debug) {
            // Log requests to console
            server.use(morgan("dev"));

            // Pretty-print JSON
            server.set("json spaces", 4);
        } else {
            var logInfo = {};
            if (fs.existsSync("/var/log/place")) logInfo.stream = require("stream-file-archive")({
                path: "/var/log/place/access-%Y-%m-%d.log",  // Write logs rotated by the day
                symlink: "/var/log/place/current.log",    // Maintain a symlink called current.log
                compress: true                // Gzip old log files
            });
            server.use(morgan("common", logInfo));
        }

        // 相信 proxy 的层级？
        server.set("trust proxy", typeof app.config.trustProxyDepth === "number" ? app.config.trustProxyDepth : 0);

        // 这两个是第三方工具监控
        if (app.logger.raven) server.use(app.logger.raven.requestHandler());
        if (app.logger.bugsnag) server.use(app.logger.bugsnag.requestHandler);
        
        // Setup passport for auth
        // 登录验证要用的设置
        server.use(session({
            secret: app.config.secret,
            name: "session"
        }));

        // session 过期设置？
        server.use(function (req, res, next) {
            req.sessionOptions.maxAge = req.session.maxAge || req.sessionOptions.maxAge;
            if(req.session.maxAge) req.session.random = Math.random() * 1000; // Force new cookie
            next();
        });

        server.use(csurf());
        server.use((req, res, next) => {
            res.locals._csrf = req.csrfToken();
            next();
        })

        if (fs.existsSync(path.join(__dirname, "../util/", "legit.js"))) {
            const legit = require("../util/legit");
            server.use(legit.keyMiddleware);
        }

        server.use((req, res, next) => {
            req.place = app;
            req.responseFactory = app.responseFactory(req, res);
            next();
        })

        server.use(passport.initialize());
        server.use((req, res, next) => {
            function authUser(user) {
                if (user && user.deactivated) {
                    user.deactivated = false;
                    user.deletionDate = null;
                    user.save();
                }
            
                if(user && user.loginError()) {
                    req.session.passport = null;
                    return res.redirect("/#signin&loginerror=1&logintext=" + encodeURIComponent(user.loginError().message));
                }

                if (user) user.recordAccess(req);
                req.user = user;
                next();
            }
            // Check session for users
            // 从 session 里面拿信息并且去数据库里检查？
            if(req.session && req.session.passport) {
                userID = req.session.passport.user;
                User.findById(req.session.passport.user).then((user) => authUser(user)).catch((err) => {
                    app.reportError("Error validating user session: " + err)
                    next();
                });
                return;
            }
            // None in session, check headers
            if (req.headers.authorization && req.headers.authorization.split(" ")[0] === "JWT") {
                passport.authenticate("jwt", { session: false }, function(err, user, info) {
                    if (!user || err) return next();
                    authUser(user);
                })(req, res, next);
                return;
            }
            next();
        });
        
        server.use((req, res, next) => app.moduleManager.processRequest(req, res, next));

        modulesWithRoutes.forEach((moduleRoutes) => {
            moduleRoutes.forEach((route) => server.use(route.root, route.middleware));
        });

        // Handle routes
        // 路由
        // 不同路由引入不同文件
        server.use("/api", require("../routes/api")(app));
        server.use("/admin", require("../routes/admin")(app));
        server.use("/auth", require("../routes/oauth")(app));
        server.use("/", require("../routes/public")(app));

        // 还是第三方的 bug 记录工具
        if (app.logger.zugsnag) server.use(app.logger.bugsnag.errorHandler);
        if (app.logger.raven) server.use(app.logger.raven.errorHandler());

        if (!app.config.debug) {
            // Production error handler, no stack traces shown to user
            server.use((err, req, res, next) => {
                if (err.code === 'EBADCSRFTOKEN') return res.status(403).json({success: false, error: {message: 'you tried, have a star.', code: 'invalid CSRF token'}});
                res.status(err.status || 500);
                app.reportError(err);
                if (req.accepts("json") && !req.accepts("html")) return res.send({ success: false, error: { message: "An unknown error occured.", code: "internal_server_error" } });
                app.responseFactory(req, res).sendRenderedResponse("errors/500");
            });
        }

        // 404 pages
        // 404 页面，没啥可说的
        server.use((req, res, next) => {
            res.status(404);
            // respond with json
            if (req.accepts("json") && !req.accepts("html")) return res.send({ success: false, error: { message: "Page not found", code: "not_found" } });
            // send HTML
            app.responseFactory(req, res).sendRenderedResponse("errors/404");
        });
    }

    // 返回了3个东西
    return {
        server: server, // express 服务器
        httpServer: httpServer, // 普通 http 服务器 
        setupRoutes: setupRoutes // 包含了这个文件几乎所有逻辑的函数，不知道有什么用z
    };
}

HTTPServer.prototype = Object.create(HTTPServer.prototype);

module.exports = HTTPServer;
