const express = require('express');
const config = require('../config/config');
const jwt = require('jwt-simple');
const passport = require('passport');
require('../util/passport')(passport);
const User = require('../models/user');
const responseFactory = require("../util/ResponseFactory")("/admin");

function AdminRouter(app) {
    let router = express.Router()

    router.get('/', app.adminMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/dashboard", req, res);
    });

    router.get('/actions', app.adminMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/dashboard", req, res);
    });

    router.get('/stats', app.adminMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/dashboard", req, res);
    });

    router.get('/log', app.adminMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/dashboard", req, res);
    });

    router.get('/pending', app.adminMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/dashboard", req, res);
    });

    router.get('/users', app.adminMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/dashboard", req, res);
    });

    router.get('/pixels', app.adminMiddleware, function(req, res) {
        return responseFactory.sendRenderedResponse("admin/dashboard", req, res);
    });

    return router;
}

AdminRouter.prototype = Object.create(AdminRouter.prototype);

module.exports = AdminRouter;
