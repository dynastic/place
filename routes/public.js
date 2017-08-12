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
        if (req.url == "/signout") return next(); // Allow the user to sign out
        if (req.user && !req.user.usernameSet && req.user.OAuthName) { // If the user has no username...
            if (req.url == "/pick-username" && req.method == "POST") return next(); // Allow the user to POST their new username
            return req.responseFactory.sendRenderedResponse("public/pick-username", req, res, {
                captcha: req.place.enableCaptcha,
                username: req.user.OAuthName.replace(/[^[a-zA-Z0-9-_]/g, "-").substring(0, 20),
                user: {
                    name: ""
                }
            }); // Send the username picker
        }
        if (req.user && req.user.passwordResetKey) {
            if (req.url == "/force-pw-reset" && req.method == "POST") return next(); // Allow the user to POST their new password
            return req.responseFactory.sendRenderedResponse("public/force-pw-reset", req, res);
        }
        next(); // Otherwise, carry on...
    });

    router.post("/pick-username", [requireUser, UsernamePickerController.postUsername]);
    router.post("/force-pw-reset", [requireUser, PasswordChangeController.postSelfServeForcedPassword]);

    router.get("/", function(req, res) {
        return req.responseFactory.sendRenderedResponse("public/index", req, res, { captcha: req.place.enableCaptcha });
    });

    router.get("/popout", function(req, res) {
        return req.responseFactory.sendRenderedResponse("public/popout", req, res);
    });

    router.get("/guidelines", GuidelineController.getGuidelines);

    router.get("/deactivated", function(req, res) {
        if (req.user) res.redirect("/");
        return req.responseFactory.sendRenderedResponse("public/deactivated", req, res);
    });

    router.get("/sitemap.xml", function(req, res, next) {
        if (typeof app.config.host === undefined) return next();
        return req.responseFactory.sendRenderedResponse("public/sitemap.xml.html", req, res, null, "text/xml");
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
