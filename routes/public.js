const router = require('express').Router();
const mongoose = require('mongoose');
const jwt = require('jwt-simple');
const passport = require('passport');
require('../config/passport')(passport);
const User = require('../models/user');
const responseFactory = require("../util/responseFactory");

router.get('/', function(req, res) {
    console.log(req.user);
    console.log(req.session);
    return responseFactory.sendRenderedResponse("public/index", req, res);
})

router.get('/signin', function(req, res) {
    if(req.user) return res.redirect("/");
    return responseFactory.sendRenderedResponse("public/signin", req, res);
})

router.post('/signin', function(req, res, next) {
    if(req.user) return res.redirect("/");
    if (!req.body.username || !req.body.password) return responseFactory.sendRenderedResponse("public/signin", req, res, {error: {message: "A username and password are required."}, username: req.body.username});
    passport.authenticate('local', function(err, user, info) {
        if (!user) return responseFactory.sendRenderedResponse("public/signin", req, res, {error: info.error || {message: "An unknown error occurred."}, username: req.body.username});
        res.redirect("/?signedin=1");
    })(req, res, next);
})

router.get('/signout', function(req, res) {
    req.logout();
    res.redirect("/?signedout=1");
})

module.exports = router;