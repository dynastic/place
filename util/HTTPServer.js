const express = require('express');
const passport = require('passport');
const APIRouter = require('../routes/api');
const PublicRouter = require('../routes/public');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const ejs = require("ejs");
const User = require("../models/user");
const session = require('cookie-session');

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

    server.set('trust proxy', 1)

    // Setup passport for auth
    server.use(session({
        secret: app.config.secret,
        name: "session"
    }));
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
                req.user = user;
                next();
            }).catch(err => {
                console.error("Error validating user session: " + err)
                next();
            });
            return;
        }
        next();
    });

    // Handle routes
    server.use('/api', APIRouter(app));
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