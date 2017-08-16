const passport = require("passport");
const speakeasy = require("speakeasy");

exports.postSignIn = (req, res, next) => {
    require("../util/passport")(passport, req.place);
    if (req.user) return res.redirect("/");
    if (!req.body.username || !req.body.password) return res.status(400).json({success: false, error: {message: "A username and password are required."}});
    passport.authenticate("local", function(err, user, info) {
        if (!user) return res.status(403).json({success: false, error: info.error || {message: "A username and password are required."}});
        if (user.twoFactorAuthEnabled()) {
            if(!req.body.totpToken) return res.status(403).json({success: false, error: {code: "totp_needed", message: "Two-factor authentication is enabled for this account. Please specify your two-factor authentication token."}});
            if(!speakeasy.verify({ secret: user.totpSecret, encoding: 'base32', token: req.body.totpToken })) return res.status(403).json({success: false, error: {code: "invalid_totp", message: "We couldn't sign you in with that two-factor authentication token. Make sure you're entering the right code and it is updated."}});
        }
        req.login(user, function(err) {
            if (err) return res.status(500).json({success: true, error: {message: "An unknown error occurred."}});
            return res.json({success: true});
        });
    })(req, res, next);
};