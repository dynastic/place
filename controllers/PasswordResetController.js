const ActionLogger = require("../util/ActionLogger");

exports.postPassword = (req, res, next) => {
        function renderResponse(errorMsg) {
            return req.responseFactory.sendRenderedResponse("public/force-pw-reset", req, res, { error: { message: errorMsg || "An unknown error occurred" } });
        }
        if(!req.user) res.redirect("/signup");
        if(!req.user.passwordResetKey) res.redirect("/");
        if(!req.body.password) return renderResponse("Please enter your new password.");
        if(req.body.password != req.body.confirmPassword) return renderResponse("The two passwords did not match.");
        if(req.user.isOauth) return renderResponse("You may not change your password as you are using an external service for login.");
        req.user.password = req.body.password;
        req.user.passwordResetKey = null;
        req.user.save(err => {
            if(err) return renderResponse("An unknown error occurred while trying to reset your password.");
            ActionLogger.log("changePassword", req.user);
            res.redirect("/?signedin=1");
        });
}