const express = require('express');
const config = require('../config/config');
const jwt = require('jwt-simple');
const passport = require('passport');
require('../util/passport')(passport);
const User = require('../models/user');
const Pixel = require('../models/pixel');
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
            if (!user && info.error) return res.status(500).json({ success: false, error: info.error });
            if (!user) return res.status(403).json({ success: false, error: { message: "You do not have a valid session", code: "invalid_session" } });
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

    router.post('/place', function(req, res, next) {
        function paintWithUser(user) {
            if (!user.canPlace()) return res.status(429).json({ success: false, error: { message: "You cannot place yet.", code: "slow_down" } });
            if (!req.body.x || !req.body.y || !req.body.colour) return res.status(400).json({ success: false, error: { message: "You need to include all paramaters", code: "invalid_parameters" } });
            let rgb = app.paintingHandler.getColourRGB(req.body.colour);
            if (!rgb) return res.status(500).json({ success: false, error: { message: "Invalid color code specified.", code: "invalid_parameters" } });
            app.paintingHandler.doPaint(rgb, req.body.x, req.body.y, user).then((pixel) => {
                return User.findById(user.id).then(user => {
                    let seconds = user.getPlaceSecondsRemaining();
                    let countData = { canPlace: seconds <= 0, seconds: seconds };
                    return res.json({ success: true, timer: countData })
                }).catch(err => res.json({ success: true }));
            }).catch(err => res.status(500).json({ success: false, error: err }));
        }
        if (req.user) return paintWithUser(req.user);
        passport.authenticate('jwt', { session: false }, function(err, user, info) {
            if (!user && info.error) return res.status(500).json({ success: false, error: info.error });
            if (!user) return res.status(403).json({ success: false, error: { message: "You do not have a valid session", code: "invalid_session" } });
            return paintWithUser(user);
        })(req, res, next);
    });

    router.get('/timer', function(req, res, next) {
        function getTimerPayload(user) {
            let seconds = user.getPlaceSecondsRemaining();
            let countData = { canPlace: seconds <= 0, seconds: seconds };
            return { success: true, timer: countData };
        }
        if (req.user) return res.send(getTimerPayload(req.user));
        passport.authenticate('jwt', { session: false }, function(err, user, info) {
            if (!user && info.error) return res.status(500).json({ success: false, error: info.error });
            if (!user) return res.status(403).json({ success: false, error: { message: "You do not have a valid session", code: "invalid_session" } });
            return res.send(getTimerPayload(user));
        })(req, res, next);
    });

    router.get('/online', function(req, res, next) {
        return res.json({ success: true, online: { count: app.websocketServer.connectedClients } });
    });

    router.get('/pixel', function(req, res, next) {
        function fail(err) {
            console.error("Pixel data retrieve error: " + err);
            return res.status(500).json({ success: false, error: { message: "An error occurred while trying to look up information about that pixel." } })
        }
        if(!req.query.x || !req.query.y) return res.status(400).json( { success: false, error: { message: "You did not specify the coordinates of the pixel to look up.", code: "bad_request" } });
        Pixel.find({xPos: req.query.x, yPos: req.query.y}).then(pixels => {
            if (pixels.length <= 0) return res.json( {success: true, pixel: null });
            pixels[0].getInfo().then(info => res.json({ success: true, pixel: info })).catch(err => fail(err));
        }).catch(err => fail(err));
    });

    getToken = function(headers) {
        if (headers && headers.authorization) {
            let parted = headers.authorization.split(' ');
            if (parted.length === 2) return parted[1];
            else return null;
        } else return null;
    };

    return router;
}

APIRouter.prototype = Object.create(APIRouter.prototype);

module.exports = APIRouter;