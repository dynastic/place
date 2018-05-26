const ActionLogger = require("../util/ActionLogger");
const fs = require('fs');
const passport = require("passport");
const speakeasy = require("speakeasy");
const absoluteURLRegex = new RegExp('^(?:[a-z]+:)?(//)?', 'i');

const User = require('../models/user');

exports.postSignIn = (req, res, next) => {
    const config = req.place.config;
    require("../util/passport")(passport, req.place);
    if (req.user) return res.redirect("/");
    if (!req.body.username || !req.body.password) return res.status(400).json({success: false, error: {message: "A username and password are required."}});
    passport.authenticate("local", function(err, user, info) {
        if (!user) return res.status(403).json({success: false, error: info.error || {message: "A username and password are required."}});
        if (!user.admin && config.maintenance && !config.maintenance.allowLogins) return res.status(403).json({
            success: false,
            error: {
                message: 'Login disabled. Please do not call this endpoint any futher.'
            }
        });
        if (user.twoFactorAuthEnabled()) {
            if(!req.body.totpToken) return res.status(403).json({success: false, error: {code: "totp_needed", message: "Two-factor authentication is enabled for this account. Please specify your two-factor authentication token."}});
            if(!speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token: req.body.totpToken, window: 6 })) return res.status(403).json({success: false, error: {code: "invalid_totp", message: "We couldn't sign you in with that two-factor authentication token. Make sure you're entering the right code and it is updated."}});
        }
        if(req.body.keepSignedIn) req.session.maxAge = 1000 * 60 * 60 * 24 * 7; // keep signed in for 7 days
        req.login(user, function(err) {
            if (err) return res.status(500).json({success: true, error: {message: "An unknown error occurred."}});
            return res.json({success: true});
        });
    })(req, res, next);
};

exports.postSignUp = (req, res, next) => {
    const config = req.place.config;
    if (config.maintenance && !config.maintenance.allowSignups) return res.status(403).json({
        success: false,
        error: {
            message: 'Registration disabled. Please do not call this endpoint any futher.'
        }
    });
    function sendError(error) {
        var status = error.intCode || 500;
        if (typeof error.intCode !== "undefined") delete error.intCode;
        res.status(status).json({success: false, error: error || {message: "An unknown error occurred", code: "unknown_error"}});
    }
    function sendValidationError(errorMsg) {
        sendError({message: errorMsg, code: "validation", intCode: 400});
    }
    function doSignup() {
        User.register(req.body.username, req.body.password, req.place, function(user, error) {
            if (!user) return sendError(error);
            user.recordAccess(req);
            if (req.body.keepSignedIn) req.session.maxAge = 1000 * 60 * 60 * 24 * 7; // keep signed in for 7 days
            req.login(user, function(err) {
                if (err) return sendError(null);
                res.json({success: true});
            });
        });
    }
    if (req.user) return sendValidationError("You are already signed in.");
    fs.exists(__dirname + "/../config/community_guidelines.md", (exists) => {
        if (!req.body.username || !req.body.password || !req.body.passwordverify) return sendValidationError("Please fill out all the fields.")
        if (req.body.password != req.body.passwordverify) return sendValidationError("The passwords you entered did not match.");
        if (!req.body.agreeToGuidelines && exists) return sendValidationError("You must agree to the Terms of Service and community guidelines to use this service.");
        if(req.place.enableCaptcha) {
            req.place.recaptcha.verify(req, (error) => {
                if (error) return sendValidationError("Please fill in the captcha properly.");
                doSignup();
            });
        } else doSignup();
    });
};

exports.getSignOut = (req, res, next) => {
    ActionLogger.log(req.place, "signOut", req.user);
    req.logout();
    req.session = null;
    var redirectURL = typeof req.query.redirectURL !== "undefined" ? req.query.redirectURL : null;
    var shouldUseRedirect = redirectURL && redirectURL != "/" && !absoluteURLRegex.test(redirectURL);
    return res.redirect(`/${(shouldUseRedirect ? redirectURL : "")}`);
};
