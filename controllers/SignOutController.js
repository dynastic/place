const ActionLogger = require("../util/ActionLogger");

const absoluteURLRegex = new RegExp('^(?:[a-z]+:)?(//)?', 'i');
exports.getSignOut = (req, res, next) => {
    ActionLogger.log(req.place, "signOut", req.user);
    req.logout();
    var redirectURL = typeof req.query.redirectURL !== "undefined" ? req.query.redirectURL : null;
    var shouldUseRedirect = redirectURL && redirectURL != "/" && !absoluteURLRegex.test(redirectURL);
    return res.redirect(`/${(shouldUseRedirect ? redirectURL : "")}`);
};