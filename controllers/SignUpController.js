const fs = require("fs");
const User = require("../models/user");

exports.postSignUp = (req, res, next) => {
    function sendError(error) {
        res.json({success: false, error: error || {message: "An unknown error occurred", code: "unknown_error"}});
    }
    function sendValidationError(errorMsg) {
        sendError({message: errorMsg, code: "validation"});
    }
    function doSignup() {
        User.register(req.body.username, req.body.password, req.place, function(user, error) {
            if(!user) return sendError(error);
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
                if(error) return sendValidationError("Please fill in the captcha properly.");
                doSignup();
            });
        } else doSignup();
    });
};