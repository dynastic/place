const express = require('express');
const Ratelimit = require('express-brute');
const ratelimitStore = require('../util/RatelimitStore');
const config = require('../config/config');
const jwt = require('jwt-simple');
const passport = require('passport');
require('../util/passport')(passport);
const User = require('../models/user');
const marked = require("../util/Markdown");
const fs = require("fs");

function PublicRouter(app) {
    const responseFactory = require("../util/ResponseFactory")(app);

    let router = express.Router()

    router.use(function(req, res, next) {
        if(req.url == "/signout") return next(); // Allow the user to sign out
        if(req.user && !req.user.usernameSet && req.user.OAuthName) { // If the user has no username...
            if(req.url == "/pick-username" && req.method == "POST") return next(); // Allow the user to POST their new username
            return responseFactory.sendRenderedResponse("public/pick-username", req, res, { captcha: app.enableCaptcha, username: req.user.OAuthName.replace(/[^[a-zA-Z0-9-_]/g, "-").substring(0, 20), user: {name: ""}}); // Send the username picker
        }
        if(req.user && req.user.passwordResetKey) {
            if(req.url == "/force-pw-reset" && req.method == "POST") return next(); // Allow the user to POST their new password
            return responseFactory.sendRenderedResponse("public/force-pw-reset", req, res);
        }
        next(); // Otherwise, carry on...
    });

    router.post('/pick-username', function(req, res) {
        function renderResponse(errorMsg) {
            return responseFactory.sendRenderedResponse("public/pick-username", req, res, { captcha: app.enableCaptcha, error: { message: errorMsg || "An unknown error occurred" }, username: req.body.username, user: {name: ""} });
        }
        if(!req.user) res.redirect("/signup");
        if(req.user.usernameSet) res.redirect("/");
        let user = req.user;
        user.name = req.body.username;
        function doPickUsername() {
            user.setUserName(user.name, function(err) {
                if(err) return renderResponse(err.message);
                req.login(user, function(err) {
                    if (err) {
                        app.reportError("Unknown user login error.");
                        return renderResponse("An unknown error occurred.");
                    }
                    res.redirect("/?signedin=1");
                });
            });
        }
        fs.exists(__dirname + "/../config/community_guidelines.md", exists => {
            if (!req.body.agreeToGuidelines && exists) return renderResponse("You must agree to the community guidelines to use this service.");
            if(app.enableCaptcha) {
                app.recaptcha.verify(req, error => {
                    if(error) return renderResponse("Please fill in the captcha properly.");
                    doPickUsername();
                });
            } else doPickUsername();
        });
    });
    
    router.post('/force-pw-reset', function(req, res) {
        function renderResponse(errorMsg) {
            return responseFactory.sendRenderedResponse("public/force-pw-reset", req, res, { error: { message: errorMsg || "An unknown error occurred" } });
        }
        if(!req.user) res.redirect("/signup");
        if(!req.user.passwordResetKey) res.redirect("/");
        if(!req.body.password) return renderResponse("Please enter your new password.");
        if(req.body.password != req.body.confirmPassword) return renderResponse("The two passwords did not match.");
        if(req.user.isOauth) return renderResponse("You may not change your password as you are using an external service for login.");
        req.user.password = req.body.password;
        req.user.passwordResetKey = null;
        req.user.save(err => {
            if(err) return renderResponse("An unknown error occurred while trying to reset your password.");
            res.redirect("/?signedin=1");
        });
    });

    const signupRatelimit = new Ratelimit(require('../util/RatelimitStore')(), {
        freeRetries: 3, // 3 signups per hour
        attachResetToRequest: false,
        refreshTimeoutOnRequest: false,
        minWait: 60*60*1000, // 1 hour
        maxWait: 60*60*1000, // 1 hour, 
        failCallback: (req, res, next, nextValidRequestDate) => {
            function renderResponse(errorMsg) {
                return responseFactory.sendRenderedResponse("public/signup", req, res, { captcha: app.enableCaptcha, error: { message: errorMsg || "An unknown error occurred" }, username: req.body.username });
            }
            res.status(429);
            return renderResponse("You're doing that too fast.");   
        },
        handleStoreError: error => app.reportError("Sign up rate limit store error: " + error),
        proxyDepth: config.trustProxyDepth
    });

    router.get('/', function(req, res) {
        return responseFactory.sendRenderedResponse("public/index", req, res);
    });

    router.get('/guidelines', function(req, res, next) {
        fs.readFile(__dirname + "/../config/community_guidelines.md", "utf8", (err, data) => {
            if(err || !data) return next();
            marked(data, (err, markdown) => {
                if(err || !markdown) return next();
                return responseFactory.sendRenderedResponse("public/guidelines", req, res, { md: markdown });
            });
        });
    });

    router.get('/deactivated', function(req, res) {
        if(req.user) res.redirect("/");
        return responseFactory.sendRenderedResponse("public/deactivated", req, res);
    });

    router.get('/sitemap.xml', function(req, res, next) {
        if(typeof config.host === undefined) return next();
        return responseFactory.sendRenderedResponse("public/sitemap.xml.html", req, res, null, "text/xml");
    });

    router.get('/signin', function(req, res) {
        if (req.user) return res.redirect("/");
        var error = null;
        if(req.query.logintext) error = { message: req.query.logintext };
        return responseFactory.sendRenderedResponse("public/signin", req, res, { error: error });
    });

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
    });

    router.get('/signup', function(req, res) {
        if (req.user) return res.redirect("/");
        return responseFactory.sendRenderedResponse("public/signup", req, res, { captcha: app.enableCaptcha });
    });

    router.get('/account', function(req, res) {
        if (!req.user) return res.redirect("/signin");
        res.redirect("/@" + req.user.name);
    });

    router.get('/user/:userID', function(req, res, next) {
        User.findById(req.params.userID).then(user => {
            res.redirect(`/@${user.name}`);
        }).catch(err => next())
    });

    router.get('/@:username', function(req, res, next) {
        User.findByUsername(req.params.username).then(user => {
            if((user.banned || user.deactivated) && !(req.user.moderator || req.user.admin)) return next();
            user.getLatestAvailablePixel().then(pixel => {
                return responseFactory.sendRenderedResponse("public/account", req, res, { profileUser: user, pixel: pixel, isLatestPixel: pixel ? ~((pixel.lastModified - user.lastPlace) / 1000) <= 3 : false, hasNewPassword: req.query.hasNewPassword });
            }).catch(err => {
                return responseFactory.sendRenderedResponse("public/account", req, res, { profileUser: user, pixel: null, isLatestPixel: false, hasNewPassword: req.query.hasNewPassword });            
            });
        }).catch(err => next())
    });

    router.post('/signup', signupRatelimit.prevent, function(req, res, next) {
        function renderResponse(errorMsg) {
            return responseFactory.sendRenderedResponse("public/signup", req, res, { captcha: app.enableCaptcha, error: { message: errorMsg || "An unknown error occurred" }, username: req.body.username });
        }
        function doSignup() {
            User.register(req.body.username, req.body.password, function(user, error) {
                if(!user) return renderResponse(error.message);
                req.login(user, function(err) {
                    if (err) return renderResponse(null);
                    return res.redirect("/?signedup=1");
                });
            });
        }
        if (req.user) return res.redirect("/");
        fs.exists(__dirname + "/../config/community_guidelines.md", exists => {
            if (!req.body.username || !req.body.password || !req.body.passwordverify) return renderResponse("Please fill out all the fields.")
            if (req.body.password != req.body.passwordverify) return renderResponse("The passwords you entered did not match.");
            if (!req.body.agreeToGuidelines && exists) return renderResponse("You must agree to the community guidelines to use this service.");
            if(app.enableCaptcha) {
                app.recaptcha.verify(req, error => {
                    if(error) return renderResponse("Please fill in the captcha properly.");
                    doSignup();
                });
            } else doSignup();
        });
    });

    if(typeof config.oauth !== 'undefined') {
        router.get('/auth/google', function(req, res, next) {
            passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] }, function(err, user, info) {
                if (!user) return responseFactory.sendRenderedResponse("public/signin", req, res, { error: info.error || { message: "An unknown error occurred." }, username: req.body.username });
                req.login(user, function(err) {
                    if (err) return responseFactory.sendRenderedResponse("public/signin", req, res, { error: { message: "An unknown error occurred." }, username: req.body.username });
                    return res.redirect("/?signedin=1");
                });
            })(req, res, next);
        })

        if (config.oauth.google.enabled) {
            router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), function(req, res) {
                res.redirect('/?signedin=1');
            });
        }

        if (config.oauth.discord.enabled) {
            router.get('/auth/discord', passport.authenticate('discord'));
            router.get('/auth/discord/callback', passport.authenticate('discord', {
                failureRedirect: '/signup',
                successRedirect: '/?signedin=1'
            }), function(req, res) {
                res.redirect('/?signedin=1') // Successful auth 
            });
        }

        if (config.oauth.facebook.enabled) {
            router.get('/auth/facebook', passport.authenticate('facebook'));
            router.get('/auth/facebook/callback', passport.authenticate('facebook', {
                failureRedirect: '/signup',
                successRedirect: '/?signedin=1'
            }), function(req, res) {
                res.redirect('/?signedin=1') // Successful auth 
            });
        }

        if (config.oauth.github.enabled) {
            router.get('/auth/github', passport.authenticate('github'));
            router.get('/auth/github/callback', passport.authenticate('github', {
                failureRedirect: '/signup',
                successRedirect: '/?signedin=1'
            }), function(req, res) {
                res.redirect('/?signedin=1') // Successful auth 
            });
        }

        if (config.oauth.reddit.enabled) {
            router.get('/auth/reddit', function(req, res, next){
                req.session.state = Math.floor(Math.random() * 10000).toString(2);
                passport.authenticate('reddit', {
                    state: req.session.state
                })(req, res, next);
            });

            router.get('/auth/reddit/callback', function(req, res, next){
                // Check for origin via state token
                if (req.query.state == req.session.state){
                    passport.authenticate('reddit', {
                        successRedirect: '/?signedin=1',
                        failureRedirect: '/signup'
                    })(req, res, next);
                } else {
                    next( new Error(403) );
                }
            });
        }

        if (config.oauth.twitter.enabled) {
            router.get('/auth/twitter', passport.authenticate('twitter'));

            router.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/signup' }), function(req, res) {
                res.redirect('/?signedin=1');
            });
        }
    }
        
    router.get('/signout', function(req, res) {
        req.logout();
        res.redirect("/?signedout=1");
    });


    return router;
}

PublicRouter.prototype = Object.create(PublicRouter.prototype);

module.exports = PublicRouter;
