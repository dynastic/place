const fs = require("fs");
const User = require("../models/user");

exports.getSignUp = (req, res, next) => {
    if (req.user) return res.redirect("/");
    return req.responseFactory.sendRenderedResponse("public/signup", req, res, { captcha: req.place.enableCaptcha });
};

exports.postSignUp = (req, res, next) => {
    function renderResponse(errorMsg) {
        return req.responseFactory.sendRenderedResponse("public/signup", req, res, { captcha: req.place.enableCaptcha, error: { message: errorMsg || "An unknown error occurred" }, username: req.body.username });
    }
    var redirectURL = typeof req.query.redirectURL !== "undefined" ? req.query.redirectURL : null;
    function doSignup() {
        User.register(req.body.username, req.body.password, req.place, function(user, error) {
            if(!user) return renderResponse(error.message);
            req.login(user, function(err) {
                if (err) return renderResponse(null);
                return res.redirect(`/${(redirectURL == "/" ? "" : redirectURL) || ""}`);
            });
        });
    }
    if (req.user) return res.redirect("/");
    fs.exists(__dirname + "/../config/community_guidelines.md", (exists) => {
        if (!req.body.username || !req.body.password || !req.body.passwordverify) return renderResponse("Please fill out all the fields.")
        if (req.body.password != req.body.passwordverify) return renderResponse("The passwords you entered did not match.");
        if (!req.body.agreeToGuidelines && exists) return renderResponse("You must agree to the community guidelines to use this service.");
        if(req.place.enableCaptcha) {
            req.place.recaptcha.verify(req, (error) => {
                if(error) return renderResponse("Please fill in the captcha properly.");
                doSignup();
            });
        } else doSignup();
    });
};