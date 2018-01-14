const passport = require("passport");

exports.getGoogle = (req, res, next) => {
    require("../util/passport")(passport, req.place);
    passport.authenticate("google", { scope: ["https://www.googleapis.com/auth/plus.login"] }, function(err, user, info) {
        if (!user) return req.responseFactory.sendRenderedResponse("public/signin", { error: info.error || { message: "An unknown error occurred." }, username: req.body.username });
        req.login(user, function(err) {
            if (err) return req.responseFactory.sendRenderedResponse("public/signin", { error: { message: "An unknown error occurred." }, username: req.body.username });
            return res.redirect("/?signedin=1");
        });
    })(req, res, next);
};

exports.getReddit = (req, res, next) => {
    require("../util/passport")(passport, req.place);
    req.session.state = Math.floor(Math.random() * 10000).toString(2);
    passport.authenticate("reddit", {
        state: req.session.state
    })(req, res, next);
};

exports.getRedditCallback = (req, res, next) => {
    require("../util/passport")(passport, req.place);
    // Check for origin via state token
    if (req.query.state == req.session.state){
        return passport.authenticate("reddit", {
            successRedirect: "/?signedin=1",
            failureRedirect: "/signup"
        })(req, res, next);
    }
    next( new Error(403) );
};