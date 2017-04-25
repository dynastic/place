const express = require('express');
const config = require('../config/config');
const jwt = require('jwt-simple');
const passport = require('passport');
require('../util/passport')(passport);
const User = require('../models/user');
const Access = require('../models/access');

function AdminRouter(app) {
    const responseFactory = require("../util/ResponseFactory")(app, "/admin");

    let router = express.Router()

    router.get('/', app.modMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/dashboard", req, res);
    });

    router.get('/actions', app.modMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/coming_soon", req, res);
    });

    router.get('/stats', app.modMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/coming_soon", req, res);
    });

    router.get('/log', app.adminMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/coming_soon", req, res);
    });

    router.get('/pending', app.adminMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/coming_soon", req, res);
    });

    router.get('/users', app.modMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/users", req, res);
    });

    router.get('/users/similar/:userID', app.modMiddleware, function(req, res) {
        if(!req.params.userID || req.params.userID == "") return res.redirect("/admin/users");
        User.findById(req.params.userID).then(user => {
            // Find similar IP accesses
            user.findSimilarIPUsers().then(users => {
                var identifiedAccounts = users.map(user => { return { user: user, reasons: ["ip"] } });
                return responseFactory.sendRenderedResponse("admin/similar_users", req, res, { target: user, identifiedAccounts: identifiedAccounts });
            }).catch(err => {
                app.reportError("Error finding similar accounts: " + err);
                res.redirect("/admin/users?similarityerror=1");
            });
        }).catch(err => res.redirect("/admin/users"));
    });

    router.get('/pixels', app.modMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/coming_soon", req, res);
    });

    router.get('/reports', app.modMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/coming_soon", req, res);
    });

    return router;
}

AdminRouter.prototype = Object.create(AdminRouter.prototype);

module.exports = AdminRouter;
