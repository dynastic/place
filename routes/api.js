const router = require('express').Router();
const config = require('../config/database');
const jwt = require('jwt-simple');
const passport = require('passport');
require('../config/passport')(passport);
const User = require('../models/user');

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) return res.json({success: false, error: 'A username and password are required.'});
    else {
        let newUser = new User({
            name: req.body.username,
            password: req.body.password,
            creationDate: Date()
        });
        // Save the user
        newUser.save(function(err) {
            if (err) return res.json({success: false, error: 'That username already exists.'});
            res.json({success: true});
        });
    }
});

router.post('/identify', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (!user) return res.status(401).json({success: false, error: info.error || "An unknown error occurred."});
        let token = jwt.encode(user, config.secret);
        res.json({success: true, token: 'JWT '+token}); // create and return jwt token here        
    })(req, res, next);
});

router.get('/session', passport.authenticate('jwt', {session: false}), function(req, res) {
    return res.status(200).send({user: req.user.toInfo()});
});

getToken = function(headers) {
    if (headers && headers.authorization) {
        let parted = headers.authorization.split(' ');
        if (parted.length === 2) return parted[1];
        else return null;
    } else return null;
}

module.exports = router;
