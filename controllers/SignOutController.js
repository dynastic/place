const ActionLogger = require("../util/ActionLogger");

exports.getSignOut = (req, res, next) => {
    ActionLogger.log(req.place, "signOut", req.user);
    req.logout();
    var redirectURL = typeof req.query.redirectURL !== "undefined" ? req.query.redirectURL : null;
    return res.redirect(`/${(redirectURL == "/" ? "" : redirectURL) || ""}`);
}
