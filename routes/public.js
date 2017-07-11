const express = require("express");
const Ratelimit = require("express-brute");

const UsernamePickerController = require("../controllers/UsernamePickerController");
const PasswordChangeController = require("../controllers/PasswordChangeController");
const GuidelineController = require("../controllers/GuidelineController");
const SignInController = require("../controllers/SignInController");
const SignUpController = require("../controllers/SignUpController");
const AccountPageController = require("../controllers/AccountPageController");
const SignOutController = require("../controllers/SignOutController");

function PublicRouter(app) {
    let router = express.Router()

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

    router.post("/pick-username", UsernamePickerController.postUsername);
    router.post("/force-pw-reset", PasswordChangeController.postSelfServeForcedPassword);

    const signupRatelimit = new Ratelimit(require("../util/RatelimitStore")(), {
        freeRetries: 3, // 3 signups per hour
        attachResetToRequest: false,
        refreshTimeoutOnRequest: false,
        minWait: 60 * 60 * 1000, // 1 hour
        maxWait: 60 * 60 * 1000, // 1 hour, 
        failCallback: (req, res, next, nextValidRequestDate) => {
            function renderResponse(errorMsg) {
                return req.responseFactory.sendRenderedResponse("public/signup", req, res, {
                    captcha: app.enableCaptcha,
                    error: {
                        message: errorMsg || "An unknown error occurred"
                    },
                    username: req.body.username
                });
            }
            res.status(429);
            return renderResponse("You're doing that too fast.");
        },
        handleStoreError: (error) => app.reportError("Sign up rate limit store error: " + error),
        proxyDepth: app.config.trustProxyDepth
    });

    router.get("/", function(req, res) {
        return req.responseFactory.sendRenderedResponse("public/index", req, res);
    });

    router.get("/popout", function(req, res) {
        return req.responseFactory.sendRenderedResponse("public/popout", req, res);
    });

    router.get("/guidelines", GuidelineController.getGuidelines);

    router.get("/deactivated", function(req, res) {
        if (req.user) res.redirect("/");
        return responseFactory.sendRenderedResponse("public/deactivated", req, res);
    });

    router.get("/sitemap.xml", function(req, res, next) {
        if (typeof app.config.host === undefined) return next();
        return req.responseFactory.sendRenderedResponse("public/sitemap.xml.html", req, res, null, "text/xml");
    });

    router.route("/signin").get(SignInController.getSignIn).post(SignInController.postSignIn);
    router.route("/signup").get(SignUpController.getSignUp).post(signupRatelimit.prevent, SignUpController.postSignUp);
    router.get("/signout", SignOutController.getSignOut);

    router.get("/account", AccountPageController.getOwnAccount);
    router.get("/user/:userID", AccountPageController.getAccountByID);
    router.get("/@:username", AccountPageController.getAccount);

    return router;
}

PublicRouter.prototype = Object.create(PublicRouter.prototype);

module.exports = PublicRouter;
