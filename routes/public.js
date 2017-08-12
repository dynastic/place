const express = require("express");

const UsernamePickerController = require("../controllers/UsernamePickerController");
const PasswordChangeController = require("../controllers/PasswordChangeController");
const GuidelineController = require("../controllers/GuidelineController");
const AccountPageController = require("../controllers/AccountPageController");
const SignOutController = require("../controllers/SignOutController");

function PublicRouter(app) {
    let router = express.Router();

    const requireUser = (req, res, next) => {
        if (!req.user) return res.status(401).redirect("/#signin");
        next();
    }

    router.use(function(req, res, next) {
        if (req.path == "/signout") return next(); // Allow the user to sign out
        if (req.user && !req.user.usernameSet && req.user.OAuthName) { // If the user has no username...
            if (req.path == "/pick-username" && req.method == "POST") return next(); // Allow the user to POST their new username
            return req.responseFactory.sendRenderedResponse("public/pick-username", {
                captcha: req.place.enableCaptcha,
                username: req.user.OAuthName.replace(/[^[a-zA-Z0-9-_]/g, "-").substring(0, 20),
                user: {
                    name: ""
                }
            }); // Send the username picker
        }
        if (req.user && req.user.passwordResetKey) {
            if (req.path == "/force-pw-reset" && req.method == "POST") return next(); // Allow the user to POST their new password
            return req.responseFactory.sendRenderedResponse("public/force-pw-reset");
        }
        next(); // Otherwise, carry on...
    });

    router.post("/pick-username", [requireUser, UsernamePickerController.postUsername]);
    router.post("/force-pw-reset", [requireUser, PasswordChangeController.postSelfServeForcedPassword]);

    router.get("/", function(req, res) {
        req.responseFactory.sendRenderedResponse("public/index", { captcha: req.place.enableCaptcha });
    });

    router.get("/popout", function(req, res) {
        req.responseFactory.sendRenderedResponse("public/popout");
    });

    router.get("/guidelines", GuidelineController.getGuidelines);

    router.get("/deactivated", function(req, res) {
        if (req.user) return res.redirect("/");
        req.responseFactory.sendRenderedResponse("public/deactivated");
    });

    router.get("/sitemap.xml", function(req, res, next) {
        if (typeof app.config.host === undefined) return next();
        req.responseFactory.sendRenderedResponse("public/sitemap.xml.html", null, "text/xml");
    });

    router.get("/signin", function(req, res, next) {
        res.redirect("/#signin");
    });

    router.get("/signup", function(req, res, next) {
        res.redirect("/#signup");
    });
    router.get("/signout", [requireUser, SignOutController.getSignOut]);

    router.get("/account", [requireUser, AccountPageController.getOwnAccount]);
    router.get("/user/:userID", AccountPageController.getAccountByID);
    router.get("/@:username", AccountPageController.getAccount);

    return router;
}

PublicRouter.prototype = Object.create(PublicRouter.prototype);

module.exports = PublicRouter;
