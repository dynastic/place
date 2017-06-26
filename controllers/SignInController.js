const passport = require("passport");

exports.getSignIn = (req, res, next) => {
    if (req.user) return res.redirect("/");
    var error = null;
    if(req.query.logintext) error = { message: req.query.logintext };
    return req.responseFactory.sendRenderedResponse("public/signin", req, res, { error: error });
};

exports.postSignIn = (req, res, next) => {
    require("../util/passport")(passport, req.place);
    if (req.user) return res.redirect("/");
    if (!req.body.username || !req.body.password) return req.responseFactory.sendRenderedResponse("public/signin", req, res, { error: { message: "A username and password are required." }, username: req.body.username });
    var redirectURL = typeof req.query.redirectURL !== "undefined" ? req.query.redirectURL : null;
    passport.authenticate("local", function(err, user, info) {
        if (!user) return req.responseFactory.sendRenderedResponse("public/signin", req, res, { error: info.error || { message: "An unknown error occurred." }, username: req.body.username });
        req.login(user, function(err) {
            if (err) return req.responseFactory.sendRenderedResponse("public/signin", req, res, { error: { message: "An unknown error occurred." }, username: req.body.username });
            return res.redirect(`/${(redirectURL == "/" ? "" : redirectURL) || ""}`);
        });
    })(req, res, next);
};