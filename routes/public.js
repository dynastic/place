const express = require("express");

const UsernamePickerController = require("../controllers/UsernamePickerController");
const PasswordChangeController = require("../controllers/PasswordChangeController");
const GuidelineController = require("../controllers/GuidelineController");
const TOSController = require("../controllers/TOSController");
const AccountPageController = require("../controllers/AccountPageController");
const AuthController = require("../controllers/AuthController");

function PublicRouter(app) {
    let router = express.Router();

    const requireUser = (req, res, next) => {
        if (!req.user) return res.status(401).redirect("/#signin");
        next();
    }

    const whitelistedTOSPaths = ["/privacy", "/guidelines", "/privacy-policy", "/rules", "/community-guidelines"];
    router.use(function(req, res, next) {
        if (req.path == "/signout") return next(); // Allow the user to sign out
        if (req.user && !req.user.usernameSet && req.user.OAuthName) { // If the user has no username...
            if (req.path == "/pick-username" && req.method == "POST") return next(); // Allow the user to POST their new username
            
            const config = req.place.config;
            if (config.maintenance && !config.maintenance.allowSignups) {
                req.logout();
                return res.redirect(403, "/");
            }
            
            return req.responseFactory.sendRenderedResponse("public/pick-username", {
                captcha: req.place.enableCaptcha,
                username: req.user.OAuthName.replace(/[^[a-zA-Z0-9-_]/g, "-").substring(0, 20),
                user: {
                    name: ""
                }
            });
        }
        if (req.user && req.user.passwordResetKey) {
            if (req.path == "/force-pw-reset" && req.method == "POST") return next(); // Allow the user to POST their new password
            return req.responseFactory.sendRenderedResponse("public/force-pw-reset");
        }
        if(!req.user) return next();
        req.user.getMustAcceptTOS().then((mustAcceptTOS) => {
            function handleError(err) {
                req.place.reportError("Error trying to accept TOS: " + err);
                res.status(500);
                req.responseManager.sendRenderedResponse("errors/500");
            }
            if(!mustAcceptTOS) return next();
            if(whitelistedTOSPaths.includes(req.path)) return next();
            if (req.method == "POST" && req.body.tosAccepted == "true") {
                return req.user.updateTOSAcceptance().then(() => {
                    req.user.save().then(() => res.redirect(req.url)).catch(handleError);
                }).catch(handleError);
            }
            TOSController.getTOS(req, res, next, true);
        }).catch(err => {
            req.place.reportError("Error trying to get user TOS status: " + err);
            next();
        });
    });

    router.post("/pick-username", [requireUser, UsernamePickerController.postUsername]);
    router.post("/force-pw-reset", [requireUser, PasswordChangeController.postSelfServeForcedPassword]);

    router.get("/", function(req, res) {
        req.responseFactory.sendRenderedResponse("public/index", { captcha: req.place.enableCaptcha });
    });

    router.get("/popout", function(req, res) {
        req.responseFactory.sendRenderedResponse("public/popout");
    });

    router.get(["/guidelines", "/rules", "/community-guidelines"], GuidelineController.getGuidelines);
    router.get(["/tos", "/terms-of-service"], TOSController.getTOS);
    router.get(["/privacy", "/privacy-policy"], TOSController.getPrivacyPolicy);

    router.get("/deactivated", function(req, res) {
        if (req.user) return res.redirect("/");
        req.responseFactory.sendRenderedResponse("public/deactivated");
    });

    router.get("/deleted", function(req, res) {
        if (req.user) return res.redirect("/");
        req.responseFactory.sendRenderedResponse("public/deleted");
    });

    router.get("/sitemap.xml", function(req, res, next) {
        if (typeof app.config.host === undefined) return next();
        req.responseFactory.sendRenderedResponse("public/sitemap.xml.pug", null, "text/xml");
    });

    router.get("/signin", function(req, res, next) {
        res.redirect("/#signin");
    });

    router.get("/signup", function(req, res, next) {
        res.redirect("/#signup");
    });
    router.get("/signout", [requireUser, AuthController.getSignOut]);

    router.get("/account", [requireUser, AccountPageController.getOwnAccount]);
    router.get("/user/:userID", AccountPageController.getAccountByID);
    router.get("/@:username", AccountPageController.getAccount);

    return router;
}

PublicRouter.prototype = Object.create(PublicRouter.prototype);

module.exports = PublicRouter;
