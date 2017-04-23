const express = require('express');
const passport = require('passport');
const APIRouter = require('../routes/api');
const PublicRouter = require('../routes/public');
const AdminRouter = require('../routes/admin');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const ejs = require("ejs");
const User = require("../models/user");
const session = require('cookie-session');
const fs = require("fs");
const path = require("path");

function HTTPServer(app) {
    var server = express();
    var httpServer = require("http").createServer(server);

    // Setup for parameters and bodies
    server.use(bodyParser.urlencoded({extended: false}));
    server.use(bodyParser.json());

    // Set rendering engine
    server.set('view engine', 'html');
    server.engine('html', ejs.renderFile);

    // Use public folder for resources
    server.use(express.static('public'));

    // Log to console
    server.use(morgan('dev'));

    server.set('trust proxy', typeof app.config.trustProxyDepth === "number" ? app.config.trustProxyDepth : 0);

    // Setup passport for auth
    server.use(session({
        secret: app.config.secret,
        name: "session"
    }));

    if (fs.existsSync(path.join(__dirname, '../util/', 'legit.js'))) {
        const legit = require('../util/legit');
        server.use(legit.keyMiddleware);
    }

    server.use(passport.initialize());
    server.use((req, res, next) => {
        var userID = null;
        if(req.session) if(req.session.passport) userID = req.session.passport.user;
        if(userID) {
            User.findById(userID).then(user => {
                if(user && user.loginError()) {
                    res.session.passport = null;
                    res.redirect("/signin?loginerror=1");
                }
                if(user) user.recordAccess(app, req.get("User-Agent"), req.get('X-Forwarded-For') || req.connection.remoteAddress, (typeof req.key !== 'undefined' ? req.key : null));
                req.user = user;
                next();
            }).catch(err => {
                app.reportError("Error validating user session: " + err)
                next();
            });
            return;
        }
        next();
    });

    // Handle routes
    server.use('/api', APIRouter(app));
    server.use('/admin', AdminRouter(app));
    server.use('/', PublicRouter(app));

    // 404 pages
    server.use((req, res, next) => {
        res.status(404);

        // respond with json
        if (req.accepts('json') && !req.accepts("html")) return res.send({ error: 'Not found' });

        // send HTML
        app.responseFactory.sendRenderedResponse("errors/404", req, res);
    });

    return {
        server: server,
        httpServer: httpServer
    }
}

HTTPServer.prototype = Object.create(HTTPServer.prototype);

module.exports = HTTPServer;