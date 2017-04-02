const router = require('express').Router();
const config = require('../config/database');
const jwt = require('jwt-simple');
const passport = require('passport');
require('../config/passport')(passport);
const User = require('../models/user');

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) return res.json({success: false, error: {message: 'A username and password are required.', code: 'invalid_parameters'}});
    User.register(req.body.username, req.body.password, function(user, error) {
        if(user) return res.json({success: true});
        return res.json({success: false, error: error || {message: "An unknown error occurred."}});
    });
});

router.post('/identify', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (!user) return res.status(401).json({success: false, error: info.error || {message: "An unknown error occurred."}});
        let token = jwt.encode(user, config.secret);
        res.json({success: true, token: 'JWT '+token}); // create and return jwt token here        
    })(req, res, next);
});

router.get('/session', passport.authenticate('jwt', {session: false}), function(req, res) {
    return res.send({success: true, user: req.user.toInfo()});
});

getToken = function(headers) {
    if (headers && headers.authorization) {
        let parted = headers.authorization.split(' ');
        if (parted.length === 2) return parted[1];
        else return null;
    } else return null;
}

module.exports = router;
