const express = require("express");
const Ratelimit = require("express-brute");
const PasswordChangeController = require("../controllers/PasswordChangeController");
const JWTController = require("../controllers/JWTController");
const DeactivateAccountController = require("../controllers/DeactivateAccountController");
const BoardImageController = require("../controllers/BoardImageController");
const PlaceController = require("../controllers/PlaceController");
const PixelInfoController = require("../controllers/PixelInfoController");
const ChatController = require("../controllers/ChatController");
const AdminActionsController = require("../controllers/AdminActionsController");
const ModeratorUserController = require("../controllers/ModeratorUserController");
const SignInController = require("../controllers/SignInController");
const SignUpController = require("../controllers/SignUpController");
const AccountPageController = require("../controllers/AccountPageController");

function APIRouter(app) {
    let router = express.Router();

    router.use(function(req, res, next) {
        res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
        res.header("Expires", "-1");
        res.header("Pragma", "no-cache");
        next();
    })

    router.use(function(req, res, next) {
        if (req.user && !req.user.usernameSet && req.user.OAuthName) return res.status(401).json({
            success: false,
            error: {
                message: "Please create a username for your account before continuing.",
                code: "oauth_no_username"
            }
        })
        if (req.user && req.user.passwordResetKey) return res.status(401).json({
            success: false,
            error: {
                message: "Please go to the Place 2.0 website to reset your password.",
                code: "forced_password_reset"
            }
        })
        next(); // Otherwise, carry on...
    });

    const requireUser = (req, res, next) => {
        if (!req.user) return res.status(401).json({
            success: false,
            error: {
                message: "You are not signed in.",
                code: "not_signed_in"
            }
        });
        next()
    }

    // Normal APIs

    const signupRatelimit = new Ratelimit(require("../util/RatelimitStore")(), {
        freeRetries: 3, // 3 signups per hour
        attachResetToRequest: false,
        refreshTimeoutOnRequest: false,
        minWait: 60 * 60 * 1000, // 1 hour
        maxWait: 60 * 60 * 1000, // 1 hour, 
        failCallback: (req, res, next, nextValidRequestDate) => {
            res.status(429).json({success: false, error:{message: "You're doing that too fast."}});
        },
        handleStoreError: (error) => app.reportError("Sign up rate limit store error: " + error),
        proxyDepth: app.config.trustProxyDepth
    });

    router.post("/signin", SignInController.postSignIn);
    router.post("/signup", signupRatelimit.prevent, SignUpController.postSignUp);

    router.post("/identify", JWTController.identifyAPIUser);

    router.post("/user/change-password", requireUser, PasswordChangeController.postSelfServePassword);

    router.post("/user/deactivate", requireUser, DeactivateAccountController.postAPIDeactivate);

    router.get("/session", requireUser, function(req, res, next) {
        res.json({
            success: true,
            user: req.user.toInfo(app)
        });
    });

    router.get("/board-image", BoardImageController.getAPIBoardImage);

    router.post("/place", requireUser, PlaceController.postAPIPixel);

    router.get("/timer", requireUser, PlaceController.getAPITimer);

    router.get("/online", function(req, res, next) {
        return res.json({
            success: true,
            online: {
                count: req.place.websocketServer.connectedClients
            }
        });
    });

    router.get("/active-now", function(req, res, next) {
        app.userActivityController.getInfo().then((info) => {
            return res.json({
                success: true,
                active: info
            });
        }).catch((err) => res.status(500).json({
            success: false
        }))
    });

    router.get("/pixel", PixelInfoController.getAPIPixelInfo);
    router.get("/pos-info", PixelInfoController.getAPIPixelInfo);

    router.get("/leaderboard", function(req, res, next) {
        app.leaderboardManager.getInfo((err, info) => {
            if (err || !info) {
                if (err) app.reportError("Error fetching leaderboard: " + err);
                if (res.headersSent) return null;
                return res.status(500).json({
                    success: false
                });
            }
            res.json({
                success: true,
                leaderboard: info.leaderboard.splice(0, 25),
                lastUpdated: info.lastUpdated
            });
        })
    });

    const chatRatelimit = new Ratelimit(require("../util/RatelimitStore")("Chat"), {
        freeRetries: 7, // 7 messages per 10-15 seconds
        attachResetToRequest: false,
        refreshTimeoutOnRequest: false,
        minWait: 10 * 1000, // 10 seconds
        maxWait: 15 * 1000, // 15 seconds,
        lifetime: 25, // remember spam for max of 25 seconds
        failCallback: (req, res, next, nextValidRequestDate) => {
            var seconds = Math.round((nextValidRequestDate - new Date()) / 1000);
            return res.status(429).json({
                success: false,
                error: {
                    message: `You're sending messages too fast! To avoid spamming the chat, please get everything into one message if you can. You will be able to chat again in ${seconds.toLocaleString()} second${seconds == 1 ? "" : "s"}.`,
                    code: "rate_limit"
                }
            })
        },
        handleStoreError: (error) => app.reportError("Chat rate limit store error: " + error),
        proxyDepth: app.config.trustProxyDepth
    });

    router.route("/chat").get(ChatController.getAPIChat).post([requireUser, chatRatelimit.prevent], ChatController.postAPIChatMessage);

    router.get("/user/:username", AccountPageController.getAPIAccount);

    // Admin APIs

    router.get("/admin/stats", app.modMiddleware, AdminActionsController.getAPIStats);
    router.get("/admin/refresh_clients", app.adminMiddleware, AdminActionsController.apiRefreshClients);
    router.get("/admin/reload_config", app.adminMiddleware, AdminActionsController.apiReloadConfig);
    router.post("/admin/broadcast", app.adminMiddleware, AdminActionsController.apiBroadcastAlert);

    router.post("/admin/users", app.modMiddleware, ModeratorUserController.getAPIUsersTable);
    router.get("/admin/toggle_mod", app.adminMiddleware, ModeratorUserController.postAPIToggleModerator);

    // Mod APIs

    router.get("/mod/toggle_ban", app.modMiddleware, ModeratorUserController.postAPIToggleBan);
    router.get("/mod/toggle_active", app.modMiddleware, ModeratorUserController.postAPIToggleActive);
    router.route("/mod/user_notes").get(app.modMiddleware, ModeratorUserController.getAPIUserNotes).post(app.modMiddleware, ModeratorUserController.postAPIUserNotes)
    router.get("/mod/similar_users/:userID", app.modMiddleware, ModeratorUserController.getAPISimilarUsers);
    router.get("/mod/actions", app.modMiddleware, ModeratorUserController.getAPIActions);

    // Debug APIs

    if (app.config.debug) {
        router.get("/trigger-error", function(req, res, next) {
            app.reportError("Oh no! An error has happened!");
            res.status(500).json({
                success: false,
                error: {
                    message: "The server done fucked up.",
                    code: "debug"
                }
            });
        });
        router.get("/trigger-error-report", function(req, res, next) {
            app.errorTracker.handleErrorCheckingInterval();
            res.json({
                success: true
            });
        });
    }

    return router;
}

APIRouter.prototype = Object.create(APIRouter.prototype);

module.exports = APIRouter;
