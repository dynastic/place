const express = require("express");
const passport = require("passport");
const APIRouter = require("../routes/api");
const PublicRouter = require("../routes/public");
const OAuthRouter = require("../routes/oauth");
const AdminRouter = require("../routes/admin");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const ejs = require("ejs");
const User = require("../models/user");
const session = require("cookie-session");
const fs = require("fs");
const path = require("path");

function HTTPServer(app) {
    var server = express();
    var httpServer = require("http").createServer(server);

    // Setup sentry bug reporting
    if (app.raven !== undefined) {
        server.use(app.raven.requestHandler());
        server.use(app.raven.errorHandler());
    }

    // Setup for parameters and bodies
    server.use(bodyParser.urlencoded({extended: false}));
    server.use(bodyParser.json());

    // Set rendering engine
    server.set("view engine", "html");
    server.engine("html", ejs.renderFile);

    var setupRoutes = function(directories, modulesWithRoutes) {
        // Use public folder for resources
        server.use(express.static("public"));
        // Register module public directories
        directories.forEach((dir) => server.use(dir.root, dir.middleware));

        // Log to console
        server.use(morgan("dev"));

        server.set("trust proxy", typeof app.config.trustProxyDepth === "number" ? app.config.trustProxyDepth : 0);

        // Setup passport for auth
        server.use(session({
            secret: app.config.secret,
            name: "session"
        }));

        if (fs.existsSync(path.join(__dirname, "../util/", "legit.js"))) {
            const legit = require("../util/legit");
            server.use(legit.keyMiddleware);
        }

        server.use((req, res, next) => {
            req.place = app;
            req.responseFactory = app.responseFactory;
            next();
        })

        server.use(passport.initialize());
        server.use((req, res, next) => {
            function authUser(user) {
                if(user && user.loginError()) {
                    req.session.passport = null;
                    return res.redirect("/signin?loginerror=1&logintext=" + encodeURIComponent(user.loginError().message));
                }
                if(user) user.recordAccess(app, req.get("User-Agent"), req.get("X-Forwarded-For") || req.connection.remoteAddress, (typeof req.key !== "undefined" ? req.key : null));
                req.user = user;
                next();
            }
            // Check session for users
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

        // Handle routes
        server.use("/api", APIRouter(app));
        server.use("/admin", AdminRouter(app));
        server.use("/auth", OAuthRouter(app));
        server.use("/", PublicRouter(app));
        //console.log(routes[0]);
        modulesWithRoutes.forEach((moduleRoutes) => {
            moduleRoutes.forEach((route) => server.use(route.root, route.middleware));
        });

        if (server.get("env") !== "development") {
            // Production error handler, no stack traces shown to user
            server.use((err, req, res, next) => {
                res.status(err.status || 500);
                app.reportError(err);
                if (req.accepts("json") && !req.accepts("html")) return res.send({ success: false, error: { message: "An unknown error occured.", code: "internal_server_error" } });
                app.responseFactory.sendRenderedResponse("errors/500", req, res);
            });
        }

        // 404 pages
        server.use((req, res, next) => {
            res.status(404);
            // respond with json
            if (req.accepts("json") && !req.accepts("html")) return res.send({ success: false, error: { message: "Page not found", code: "not_found" } });
            // send HTML
            app.responseFactory.sendRenderedResponse("errors/404", req, res);
        });
    }

    return {
        server: server,
        httpServer: httpServer,
        setupRoutes: setupRoutes
    };
}

HTTPServer.prototype = Object.create(HTTPServer.prototype);

module.exports = HTTPServer;