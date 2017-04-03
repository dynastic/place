const express = require('express');
const config = require('../config/database');
const jwt = require('jwt-simple');
const passport = require('passport');
require('../config/passport')(passport);
const User = require('../models/user');
const path = require("path");

function APIRouter(app) {
    let router = express.Router();

    router.post('/signup', function(req, res) {
        return res.status(503).json({ success: false, error: { message: "API signup is no longer available.", code: "unavailable" } });
    });

    router.post('/identify', function(req, res, next) {
        if (!req.body.username || !req.body.password) return res.status(403).json({ success: false, error: { message: 'A username and password are required.', code: 'invalid_parameters' } });
        passport.authenticate('local', { session: false }, function(err, user, info) {
            if (!user) return res.status(500).json({ success: false, error: info.error || { message: "An unknown error occurred." } });
            let token = jwt.encode(user, config.secret);
            res.json({ success: true, token: 'JWT ' + token }); // create and return jwt token here        
        })(req, res, next);
    });

    router.get('/session', function(req, res, next) {
        if (req.user) return res.send({ success: true, user: req.user.toInfo() });
        passport.authenticate('jwt', { session: false }, function(err, user, info) {
            if (!user) return res.status(500).json({ success: false, error: info.error || { message: "An unknown error occurred." } });
            return res.send({ success: true, user: user.toInfo() });
        })(req, res, next);
    });

    router.get('/board-image', function(req, res, next) {
        if (!app.paintingHandler.hasImage) return res.status(503).json({ success: false, error: { message: "We are not yet ready to take requests.", code: "not_ready" } });
        app.paintingHandler.getOutputImage().then((image) => {
            return res.set({ 'Content-Type': 'image/png' }).send(image);
        }).catch((err) => {
            console.error("An error occurred while trying to serve the board image: " + err);
            return res.status(500).json({ success: false, error: { message: "We could not retrieve the current board image.", code: "image_fail" } });
        });
    });

    getToken = function(headers) {
        if (headers && headers.authorization) {
            let parted = headers.authorization.split(' ');
            if (parted.length === 2) return parted[1];
            else return null;
        } else return null;
    }

    return router;
}

APIRouter.prototype = Object.create(APIRouter.prototype);

module.exports = APIRouter;