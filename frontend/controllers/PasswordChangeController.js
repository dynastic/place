const User = require("../models/user");
const ActionLogger = require("../util/ActionLogger");

exports.postSelfServeForcedPassword = (req, res, next) => {
    function renderResponse(errorMsg) {
        return req.responseFactory.sendRenderedResponse("public/force-pw-reset", { error: { message: errorMsg || "An unknown error occurred" } });
    }
    if(!req.user.passwordResetKey) res.redirect("/");
    if(!req.body.password) return renderResponse("Please enter your new password.");
    if(req.body.password != req.body.confirmPassword) return renderResponse("The two passwords did not match.");
    if(req.user.isOauth) return renderResponse("You may not change your password as you are using an external service for login.");
    var passwordError = User.getPasswordError(req.body.password);
    if(passwordError) return renderResponse(passwordError);
    req.user.password = req.body.password;
    req.user.passwordResetKey = null;
    req.user.save((err) => {
        if(err) return renderResponse("An unknown error occurred while trying to reset your password.");
        ActionLogger.log(req.place, "changePassword", req.user);
        res.redirect("/?signedin=1");
    });
};

exports.postSelfServePassword = (req, res, next) => {
    if (!req.body.old || !req.body.new) return res.status(403).json({success: false, error: {message: "Your old password and new password are required.", code: "invalid_parameters"}});
    if(req.user.isOauth) return res.status(400).json({success: false, error: {message: "You may not change your password as you are using an external service for login.", code: "regular_account_only"}});
    req.user.comparePassword(req.body.old, (error, match) => {
        if(!match || error) return res.status(401).json({success: false, error: {message: "The old password you entered was incorrect.", code: "incorrect_password"}});
        var passwordError = User.getPasswordError(req.body.new);
        if(passwordError) return res.status(400).json({success: false, error: {message: passwordError, code: "password_validation"}});
        req.user.password = req.body.new;
        req.user.save().then(() => {
            ActionLogger.log(req.place, "changePassword", req.user);
            return res.json({success: true});
        }).catch((err) => {
            req.place.reportError("Password change error: " + err);
            return res.status(500).json({success: false});
        });
    });
};