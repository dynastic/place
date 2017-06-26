const express = require("express");
const User = require("../models/user");

function AdminRouter(app) {
    const responseFactory = require("../util/ResponseFactory")(app, "/admin");

    let router = express.Router()
    
    router.use(function(req, res, next) {
        // Don't allow anything if user has forced pw reset or OAuth not configured
        if(req.user && ((!req.user.usernameSet && req.user.OAuthName) || req.user.passwordResetKey)) res.redirect("/");
        next(); // Otherwise, carry on...
    });

    router.get("/", app.modMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/dashboard", req, res);
    });

    router.get("/actions", app.modMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/actions", req, res, {title: "Recent Actions", modOnly: false});
    });

    router.get("/log", app.modMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/actions", req, res, {title: "Moderator Log", modOnly: true});
    });

    router.get("/users", app.modMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/users", req, res);
    });

    router.get("/users/similar/:userID", app.modMiddleware, function(req, res) {
        function renderError(msg = "An unknown error occurred.") {
            return responseFactory.sendRenderedResponse("admin/similar_users_error", req, res, { errorMsg: msg });
        }
        if(!req.params.userID || req.params.userID == "") return renderError("You did not specify a user ID to look up.");
        User.findById(req.params.userID).then((user) => {
            if(!req.user.canPerformActionsOnUser(user)) return renderError("You may not perform actions on this user.");
            return responseFactory.sendRenderedResponse("admin/similar_users", req, res, { target: user });
        }).catch((err) => renderError("Could not find a user by that ID."));
    });

    router.get("/pixels", app.modMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/coming_soon", req, res);
    });

    router.get("/reports", app.modMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/coming_soon", req, res);
    });

    return router;
}

AdminRouter.prototype = Object.create(AdminRouter.prototype);

module.exports = AdminRouter;
