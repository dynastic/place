const express = require('express');
const Ratelimit = require('express-brute');
const ratelimitStore = require('../util/ratelimit-store');
const config = require('../config/config');
const jwt = require('jwt-simple');
const passport = require('passport');
require('../util/passport')(passport);
const User = require('../models/user');
const responseFactory = require("../util/ResponseFactory");

function PublicRouter(app) {
    let router = express.Router()

        const ratelimitCallback = function (req, res, next, nextValidRequestDate) {
         function renderResponse(errorMsg) {
             return responseFactory.sendRenderedResponse("public/signup", req, res, { captcha: app.recaptcha.render(), error: { message: errorMsg || "An unknown error occurred" }, username: req.body.username });
         }
         res.status(429);
         return renderResponse("You're doing that too fast.");
     }
 
     const handleStoreError = function (error) {
         log.error(error);
     }
 
     const signupRatelimit = new Ratelimit(ratelimitStore, {
         freeRetries: 3, // 3 signups per hour
         attachResetToRequest: false,
         refreshTimeoutOnRequest: false,
         minWait: 60*60*1000, // 1 hour
         maxWait: 60*60*1000, // 1 hour, 
         failCallback: ratelimitCallback,
         handleStoreError: handleStoreError
     });

    router.get('/', function(req, res) {
        return responseFactory.sendRenderedResponse("public/index", req, res);
    })

    router.get('/sitemap.xml', function(req, res, next) {
        if(typeof config.host === undefined) return next();
        return responseFactory.sendRenderedResponse("public/sitemap.xml.html", req, res, null, "text/xml");
    })

    router.get('/signin', function(req, res) {
        if (req.user) return res.redirect("/");
        return responseFactory.sendRenderedResponse("public/signin", req, res);
    })

    router.post('/signin', function(req, res, next) {
        if (req.user) return res.redirect("/");
        if (!req.body.username || !req.body.password) return responseFactory.sendRenderedResponse("public/signin", req, res, { error: { message: "A username and password are required." }, username: req.body.username });
        passport.authenticate('local', function(err, user, info) {
            if (!user) return responseFactory.sendRenderedResponse("public/signin", req, res, { error: info.error || { message: "An unknown error occurred." }, username: req.body.username });
            req.login(user, function(err) {
                if (err) return responseFactory.sendRenderedResponse("public/signin", req, res, { error: { message: "An unknown error occurred." }, username: req.body.username });
                return res.redirect("/?signedin=1");
            });
        })(req, res, next);
    })

    router.get('/signup', function(req, res) {
        if (req.user) return res.redirect("/");
        return responseFactory.sendRenderedResponse("public/signup", req, res, { captcha: app.recaptcha.render() });
    })

    router.get('/account', function(req, res) {
        if (!req.user) return res.redirect("/signin");
        return responseFactory.sendRenderedResponse("public/account", req, res);
    })

    router.post('/signup', signupRatelimit.prevent, function(req, res, next) {
        function renderResponse(errorMsg) {
            return responseFactory.sendRenderedResponse("public/signup", req, res, { captcha: app.recaptcha.render(), error: { message: errorMsg || "An unknown error occurred" }, username: req.body.username });
        }
        if (req.user) return res.redirect("/");
        if (!req.body.username || !req.body.password || !req.body.passwordverify) return renderResponse("Please fill out all the fields.")
        if (req.body.password != req.body.passwordverify) return renderResponse("The passwords you entered did not match.")
        app.recaptcha.verify(req, error => {
            if(error) return renderResponse("Please fill in the captcha properly.")
            User.register(req.body.username, req.body.password, function(user, error) {
                if(!user) return renderResponse(error.message);
                req.login(user, function(err) {
                    if (err) return renderResponse(null);
                    return res.redirect("/?signedup=1");
                });
            });
        });
    })

    router.get('/signout', function(req, res) {
        req.logout();
        res.redirect("/?signedout=1");
    })

    return router;
}

PublicRouter.prototype = Object.create(PublicRouter.prototype);

module.exports = PublicRouter;
