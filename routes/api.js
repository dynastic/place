const express = require('express');
const config = require('../config/config');
const jwt = require('jwt-simple');
const passport = require('passport');
require('../util/passport')(passport);
const User = require('../models/user');
const Pixel = require('../models/pixel');
const ChatMessage = require('../models/chatMessage');
const Ratelimit = require('express-brute');
const path = require("path");
const fs = require('fs');
const ActionLogger = require("../util/ActionLogger");
const Action = require("../models/action");

function APIRouter(app) {
    let router = express.Router();

    router.use(function(req, res, next) {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        next();
    })

    router.use(function(req, res, next) {
        if(req.user && !req.user.usernameSet && req.user.OAuthName) return res.status(401).json({ success: false, error: { message: "Please create a username for your account before continuing.", code: "oauth_no_username" } })
        if(req.user && req.user.passwordResetKey) return res.status(401).json({ success: false, error: { message: "Please go to the Place 2.0 website to reset your password.", code: "forced_password_reset" }})
        next(); // Otherwise, carry on...
    });

    const requireUser = (req, res, next) => {
        if (!req.user) return res.status(401).json({success: false, error: {message: "You are not signed in.", code: "not_signed_in"}});
        next()
    }

    // Normal APIs

    router.post('/signup', function(req, res) {
        return res.status(503).json({ success: false, error: { message: "API signup is no longer available.", code: "unavailable" } });
    });

    router.post('/identify', function(req, res, next) {
        if (!req.body.username || !req.body.password) return res.status(400).json({ success: false, error: { message: 'A username and password are required.', code: 'invalid_parameters' } });
        passport.authenticate('local', { session: false }, function(err, user, info) {
            if (!user) return res.status(500).json({ success: false, error: info.error || { message: "An unknown error occurred." } });
            let token = jwt.encode(user, config.secret);
            res.json({ success: true, token: `JWT ${token}`, user: user.toInfo(app) }); // create and return jwt token here
        })(req, res, next);
    });

    router.post('/user/change_password', requireUser, function(req, res) {
        if (!req.body.old || !req.body.new) return res.status(403).json({success: false, error: {message: 'Your old password and new password are required.', code: 'invalid_parameters'}});
        if(req.user.isOauth) return res.status(400).json({success: false, error: {message: 'You may not change your password as you are using an external service for login.', code: 'regular_account_only'}});
        req.user.comparePassword(req.body.old, (error, match) => {
            if(!match || error) return res.status(401).json({success: false, error: {message: "The old password you entered was incorrect.", code: "incorrect_password"}});
            req.user.password = req.body.new;
            req.user.save().then(() => {
                ActionLogger.log("changePassword", req.user);
                return res.json({success: true});
            }).catch(err => {
                app.reportError("Password change error: " + err);
                return res.status(500).json({success: false});
            });
        });
    });

    router.post('/user/deactivate', requireUser, function(req, res) {
        if (!req.body.password) return res.status(400).json({sucess: false, error: {message: "The password field is required.", code: "invalid_parameters"}});
        req.user.comparePassword(req.body.password, (error, match) => {
            if(!match || error) return res.status(401).json({success: false, error: {message: "The password you entered was incorrect.", code: "incorrect_password"}});
            req.user.deactivated = true;
            ActionLogger.log("deactivate", req.user);
            req.user.save();
            return res.json({success: true});
        });
    });

    router.get('/session', requireUser, function(req, res, next) {
        res.json({ success: true, user: req.user.toInfo(app) });
    });

    router.get('/board-image', function(req, res, next) {
        if (!app.paintingHandler.hasImage) return res.status(503).json({ success: false, error: { message: "We are not yet ready to take requests.", code: "not_ready" } });
        app.paintingHandler.getOutputImage().then((image) => {
            return res.set({ 'Content-Type': 'image/png' }).send(image);
        }).catch((err) => {
            app.reportError("Error while serving board image: " + err);
            return res.status(500).json({ success: false, error: { message: "We could not retrieve the current board image.", code: "image_fail" } });
        });
    });

    router.post('/place', requireUser, function(req, res, next) {
         if (fs.existsSync(path.join(__dirname, '../util/', 'legit.js'))) {
             const legit = require('../util/legit');
             if (!legit.verify(req)) return res.status(403).json({ success: false, error: { message: "You cannot do that.", code: "unauthorized" } });
         }
        function paintWithUser(user) {
            if (!user.canPlace()) return res.status(429).json({ success: false, error: { message: "You cannot place yet.", code: "slow_down" } });
            if (!req.body.x || !req.body.y || !req.body.colour) return res.status(400).json({ success: false, error: { message: "You need to include all paramaters", code: "invalid_parameters" } });
            var x = Number.parseInt(req.body.x), y = Number.parseInt(req.body.y);
            if(Number.isNaN(x) || Number.isNaN(y)) return res.status(400).json({ success: false, error: { message: "Your coordinates were incorrectly formatted", code: "invalid_parameters" } });
            var rgb = app.paintingHandler.getColourRGB(req.body.colour);
            if (!rgb) return res.status(400).json({ success: false, error: { message: "Invalid color code specified.", code: "invalid_parameters" } });
            app.paintingHandler.doPaint(rgb, x, y, user).then(pixel => {
                return User.findById(user.id).then(user => {
                    var seconds = user.getPlaceSecondsRemaining();
                    var countData = { canPlace: seconds <= 0, seconds: seconds };
                    return res.json({ success: true, timer: countData })
                }).catch(err => res.json({ success: true }));
            }).catch(err => {
                app.reportError("Error placing pixel: " + err);
                res.status(500).json({ success: false, error: err })
            });
        }
        paintWithUser(req.user);
    });

    router.get('/timer', requireUser, function(req, res, next) {
        function getTimerPayload(user) {
            let seconds = user.getPlaceSecondsRemaining();
            let countData = { canPlace: seconds <= 0, seconds: seconds };
            return { success: true, timer: countData };
        }
        return res.json(getTimerPayload(req.user));
    });

    router.get('/online', function(req, res, next) {
        return res.json({ success: true, online: { count: app.websocketServer.connectedClients } });
    });

    router.get('/pixel', function(req, res, next) {
        function fail(err) {
            app.reportError("Pixel data retrieve error: " + err);
            return res.status(500).json({ success: false, error: { message: "An error occurred while trying to look up information about that pixel." } })
        }
        if(!req.query.x || !req.query.y) return res.status(400).json( { success: false, error: { message: "You did not specify the coordinates of the pixel to look up.", code: "bad_request" } });
        var overrideDataAccess = req.user && (req.user.moderator || req.user.admin);
        Pixel.find({xPos: req.query.x, yPos: req.query.y}).then(pixels => {
            if (pixels.length <= 0) return res.json({ success: true, pixel: null });
            pixels[0].getInfo(overrideDataAccess, app).then(info => {
                res.json({ success: true, pixel: info })
            }).catch(err => fail(err));
        }).catch(err => fail(err));
    });

    router.get('/chat', function(req, res, next) {
         ChatMessage.getLatestMessages().then(messages => {
            var overrideDataAccess = req.user && (req.user.moderator || req.user.admin);
            var promises = messages.reverse().map(m => m.getInfo(overrideDataAccess));
            Promise.all(promises).then(messages => {
                res.json({ success: true, messages: messages });
            }).catch(err => res.status(500).json({ success: false }));
         }).catch(err => res.status(500).json( { success: false }))
    });

    router.get('/leaderboard', function(req, res, next) {
        app.leaderboardManager.getInfo((err, leaderboard) => {
            if(err || !leaderboard) {
                app.reportError("Error fetching leaderboard: " + (err || "Returned null"))     
                return res.status(500).json({ success: false });
            }
            res.json({ success: true, leaderboard: leaderboard });
        })
    });

    const chatRatelimit = new Ratelimit(require('../util/RatelimitStore')("Chat"), {
        freeRetries: 7, // 7 messages per 10-15 seconds
        attachResetToRequest: false,
        refreshTimeoutOnRequest: false,
        minWait: 10*1000, // 10 seconds
        maxWait: 15*1000, // 15 seconds,
        lifetime: 25, // remember spam for max of 25 seconds
        failCallback: (req, res, next, nextValidRequestDate) => {
            var seconds = Math.round((nextValidRequestDate - new Date()) / 1000);
            return res.status(429).json({ success: false, error: { message: `You're sending messages too fast! To avoid spamming the chat, please get everything into one message if you can. You will be able to chat again in ${seconds.toLocaleString()} second${seconds == 1 ? "" : "s"}.`, code: "rate_limit" } })
        },
        handleStoreError: error => app.reportError("Chat rate limit store error: " + error),
        proxyDepth: config.trustProxyDepth
    });

    router.post('/chat', [requireUser, chatRatelimit.prevent], function(req, res, next) {
        if(!req.body.text || !req.body.x || !req.body.y) return res.status(400).json({ success: false, error: { message: "You did not specify the required information to send a message.", code: "bad_request" } })
        if(req.body.text.length < 1 || req.body.text.length > 250) return  res.status(400).json( { success: false, error: { message: "Your message must be shorter than 250 characters and may not be blank.", code: "message_text_length" } })
         ChatMessage.createMessage(app, req.user.id, req.body.text, req.body.x, req.body.y).then(message => {
             var info = message.getInfo().then(info => {
                res.json({ success: true, message: info });
                ActionLogger.log("sendChatMessage", req.user, null, { messageID: info.id });
                app.websocketServer.broadcast("new_message", info);
             }).catch(err => res.json({ success: true }))
         }).catch(err => {
             app.reportError(err);
             res.status(500).json( { success: false, error: { message: "An error occurred while trying to send your message.", code: "server_message_error" } })
        })
    });

    // Admin APIs

    router.get("/admin/stats", app.modMiddleware, function(req, res, next) {
        var signups24h = null, pixelsPlaced24h = null, pixelsPerMin = null;
        let dateBack24h = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
        let dateBack20m = new Date(new Date().getTime() - (20 * 60 * 1000));
        function finish() {
            return res.json({ success: true, stats: { online: app.websocketServer.connectedClients, signups24h: signups24h, pixelsPlaced24h: pixelsPlaced24h, pixelsPerMin: pixelsPerMin } });
        }
        function doPixelsPerMin() {
            Pixel.count({lastModified: {$gt: dateBack20m}}).then(c => {
                pixelsPerMin = Math.round(c / 20);
                finish()
            }).catch(err => finish());
        }
        function doPixelsPlaced24h() {
            Pixel.count({lastModified: {$gt: dateBack24h}}).then(c => {
                pixelsPlaced24h = c;
                doPixelsPerMin()
            }).catch(err => doPixelsPerMin());
        }
        function doSignups24h() {
            User.count({creationDate: {$gt: dateBack24h}}).then(c => {
                signups24h = c;
                doPixelsPlaced24h()
            }).catch(err => doPixelsPlaced24h());
        }
        doSignups24h();
    });

    router.get("/admin/refresh_clients", app.adminMiddleware, function(req, res, next) {
        app.websocketServer.broadcast("reload_client");
        ActionLogger.log("refreshClients", req.user);
        res.json({success: true});
    });

    router.get("/admin/reload_config", app.adminMiddleware, function(req, res, next) {
        app.loadConfig();
        ActionLogger.log("reloadConfig", req.user);
        res.json({success: true});
    });

    router.post("/admin/users", app.modMiddleware, function(req, res, next) {
        let searchValue = req.body.search ? req.body.search.value || "" : "";
        var sort = { creationDate: "desc" };
        if(req.body.order && req.body.order.length > 0 && req.body.columns) {
            if(req.body.columns.length > req.body.order[0].column || 1) {
                let colName = req.body.columns[req.body.order[0].column].data;
                sort = {}, sort[colName] = req.body.order[0].dir || "desc";
            }
        }
        User.dataTables({
            limit: req.body.length || 25,
            skip: req.body.start || 0,
            select: ["id", "name", "creationDate", "admin", "moderator", "banned", "deactivated", "lastPlace", "placeCount"],
            search: {
                value: searchValue,
                fields: ['name']
            }, sort: sort
        }, (err, table) => {
            if(err) {
                app.reportError("Error trying to receive admin user table data.");
                return res.status(500).json({success: false});
            }
            User.find().count().then(c => res.json(Object.assign({success: true, recordsTotal: c}, table))).catch(err => {
                app.reportError("Error trying to receive user count for admin user table.");
                res.status(500).json({success: false});
            });
        });
    });

    router.get("/admin/toggle_mod", app.adminMiddleware, function(req, res, next) {
        if(!req.query.id) return res.status(400).json({success: false, error: {message: "No user ID specified.", code: "bad_request"}});
        if(req.query.id == req.user.id) return res.status(400).json({success: false, error: {message: "You may not change your own moderator status.", code: "cant_modify_self"}});
        User.findById(req.query.id).then(user => {
            if(!req.user.canPerformActionsOnUser(user)) return res.status(403).json({success: false, error: {message: "You may not perform actions on this user.", code: "access_denied_perms"}});
            user.moderator = !user.moderator;
            user.save().then(user => {
                ActionLogger.log(user.moderator ? "giveModerator" : "removeModerator", user, req.user);
                res.json({success: true, moderator: user.moderator})
            }).catch(err => {
                app.reportError("Error trying to save moderator status on user.");
                res.status(500).json({success: false});
            });
        }).catch(err => {
            app.reportError("Error trying to get user to set moderator status on.");
            res.status(500).json({success: false})
        });
    });

    // Mod APIs

    router.get("/mod/toggle_ban", app.modMiddleware, function(req, res, next) {
        if(!req.query.id) return res.status(400).json({success: false, error: {message: "No user ID specified.", code: "bad_request"}});
        if(req.query.id == req.user.id) return res.status(400).json({success: false, error: {message: "You may not ban yourself.", code: "cant_modify_self"}});
        User.findById(req.query.id).then(user => {
            if(!req.user.canPerformActionsOnUser(user)) return res.status(403).json({success: false, error: {message: "You may not perform actions on this user.", code: "access_denied_perms"}});
            user.banned = !user.banned;
            user.save().then(user => {
                ActionLogger.log(user.banned ? "ban" : "unban", user, req.user);
                res.json({success: true, banned: user.banned})
            }).catch(err => {
                app.reportError("Error trying to save banned status on user.");
                res.status(500).json({success: false})
            });
        }).catch(err => {
            app.reportError("Error trying to get user to set banned status on.");
            res.status(500).json({success: false});
        });
    });

    router.get("/mod/toggle_active", app.modMiddleware, function(req, res, next) {
        if(!req.query.id) return res.status(400).json({success: false, error: {message: "No user ID specified.", code: "bad_request"}});
        User.findById(req.query.id).then(user => {
            if(!req.user.canPerformActionsOnUser(user)) return res.status(403).json({success: false, error: {message: "You may not perform actions on this user.", code: "access_denied_perms"}});
            user.deactivated = !user.deactivated;
            user.save().then(user => {
                ActionLogger.log(user.deactivated ? "deactivateOther" : "activateOther", user, req.user);
                res.json({success: true, deactivated: user.deactivated})
            }).catch(err => {
                app.reportError("Error trying to save activation status on user.");
                res.status(500).json({success: false})
            });
        }).catch(err => {
            app.reportError("Error trying to get user to set activation status on.");
            res.status(500).json({success: false});
        });
    });

    router.get('/mod/similar_users/:userID', app.modMiddleware, function(req, res) {
        if(!req.params.userID || req.params.userID == "") return res.status(400).json({success: false, error: {message: "No user ID specified.", code: "bad_request"}});
        User.findById(req.params.userID).then(user => {
            if(!req.user.canPerformActionsOnUser(user)) return res.status(403).json({success: false, error: {message: "You may not perform actions on this user.", code: "access_denied_perms"}});
            user.findSimilarIPUsers().then(users => {
                var identifiedAccounts = users.map(user => { return { user: user.toInfo(app), reasons: ["ip"] } });
                function respondIdentifiedAccounts() {
                    res.json({ success: true, target: user.toInfo(app), identifiedAccounts: identifiedAccounts })
                }
                if (fs.existsSync(path.join(__dirname, '../util/', 'legit.js'))) {
                    const legit = require('../util/legit');
                    var currentUsernames = identifiedAccounts.map(i => i.user.username);
                    legit.findSimilarUsers(user).then(users => {
                        var reason = legit.similarityAspectName();
                        users.forEach(user => {
                            if(currentUsernames.includes(user.name)) {
                                var i = currentUsernames.indexOf(user.name);
                                identifiedAccounts[i].reasons.push(reason);
                            } else identifiedAccounts.push({ user: user.toInfo(app), reasons: [reason] });
                        });
                        respondIdentifiedAccounts();
                    }).catch(err => respondIdentifiedAccounts());
                } else respondIdentifiedAccounts();
            }).catch(err => {
                app.reportError("Error finding similar accounts: " + err);
                res.status(500).json({ success: false });
            });
        }).catch(err => res.status(400).json({success: false, error: {message: "No user with that ID exists.", code: "user_doesnt_exist"}}));
    });

    router.get('/mod/actions', app.modMiddleware, function(req, res) {
        var condition = { actionID: { $in: ActionLogger.actionIDsToRetrieve(req.query.modOnly === true) } };
        if (req.query.lastID) condition._id = { $gt: req.query.lastID };
        Action.find(condition, {}, {_id: 1}).limit(Math.min(250, req.query.limit || 25)).then(actions => {
            var lastID = null;
            if(actions.length > 1) lastID = actions[actions.length - 1]._id;
            var promises = actions.map(a => a.getInfo());
            Promise.all(promises).then(actions => {
                res.json({ success: true, actions: actions, lastID: lastID })
            }).catch(err => res.status(500).json({ success: false }))
        }).catch(err => {
            app.reportError("An error occurred while trying to retrieve actions: " + err);
            res.status(500).json({ success: false });
        })

    });

    // Debug APIs

    if(config.debug) {
        router.get("/trigger-error", function(req, res, next) {
            app.reportError("Oh no! An error has happened!");
            res.status(500).json({ success: false, error: { message: "The server done fucked up.", code: "debug" } });
        });
        router.get("/trigger-error-report", function(req, res, next) {
            app.errorTracker.handleErrorCheckingInterval();
            res.json({ success: true });
        });
    }

    return router;
}

APIRouter.prototype = Object.create(APIRouter.prototype);

module.exports = APIRouter;
