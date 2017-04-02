const router = require('express').Router();
const mongoose = require('mongoose');
const jwt = require('jwt-simple');
const passport = require('passport');
require('../config/passport')(passport);
const User = require('../models/user');
const responseFactory = require("../util/responseFactory");

router.get('/', function(req, res) {
    return responseFactory.sendRenderedResponse("public/index", req, res);
})

router.get('/signout', function(req, res) {
    req.logout();
    res.redirect("/?signedout=1");
})

module.exports = router;