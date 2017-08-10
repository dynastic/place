const passport = require("passport");

exports.postSignIn = (req, res, next) => {
    require("../util/passport")(passport, req.place);
    if (req.user) return res.redirect("/");
    if (!req.body.username || !req.body.password) return res.json({success: false, error: {message: "A username and password are required."}});
    var redirectURL = typeof req.query.redirectURL !== "undefined" ? req.query.redirectURL : null;
    passport.authenticate("local", function(err, user, info) {
        if (!user) return res.json({success: false, error: info.error || {message: "A username and password are required."}});
        req.login(user, function(err) {
            if (err) return res.json({success: true, error: {message: "An unknown error occurred."}});
            return res.json({success: true});
        });
    })(req, res, next);
};