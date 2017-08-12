const fs = require("fs");
const User = require("../models/user");

exports.postSignUp = (req, res, next) => {
    function sendError(errorMsg) {
        res.json({success: false, error: {message: errorMsg || "An unknown error occurred"}})
    }
    function doSignup() {
        User.register(req.body.username, req.body.password, req.place, function(user, error) {
            if(!user) return sendError(error.message);
            req.login(user, function(err) {
                if (err) return sendError(null);
                res.json({success: true});
            });
        });
    }
    if (req.user) return sendError("You are already signed in.");
    fs.exists(__dirname + "/../config/community_guidelines.md", (exists) => {
        if (!req.body.username || !req.body.password || !req.body.passwordverify) return sendError("Please fill out all the fields.")
        if (req.body.password != req.body.passwordverify) return sendError("The passwords you entered did not match.");
        if (!req.body.agreeToGuidelines && exists) return sendError("You must agree to the community guidelines to use this service.");
        if(req.place.enableCaptcha) {
            req.place.recaptcha.verify(req, (error) => {
                if(error) return sendError("Please fill in the captcha properly.");
                doSignup();
            });
        } else doSignup();
    });
};