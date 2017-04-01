const router = require('express').Router();
const config = require('../config/database');
const mongoose = require('mongoose');
const jwt = require('jwt-simple');
require('../config/passport')(passport);
const User = require('../models/user');

mongoose.connect(config.database);

router.post('/signup', function(req, res) {
    if (!req.body.name || !req.body.password) res.json({success: false, error: 'A username and password is required.'});
    else {
        let newUser = new User({
            name: req.body.name,
            password: req.body.password
        });
        // Save the user
        newUser.save(function(err) {
            if (err) return res.json({success: false, error: 'That username already exists.'});
            res.json({success: true});
        });
    }
});

router.post('/identify', function(req, res) {
    User.findOne({
        name: req.body.name
    }, function(err, user) {
        if (err) throw err;
        if (!user) res.send({success: false, error: 'Incorrect username or password.'});
        else {
            user.comparePassword(req.body.password, function(err, match) {
                if (match && !err) {
                    let token = jwt.encode(user, config.secret);
                    res.json({success: true, token: 'JWT '+token}); // create and return jwt token here
                } else { res.send({success: false, error: 'Incorrect username or password.'}); }
            });
        }
    })
});

router.get('/session', passport.authenticate('jwt', {session: false}), function(req, res) {
    let token = getToken(req.headers);
    if (token) {
        // todo, ab pls handle valid token function handling
        return res.status(200).send({msg: 'todo daddy'});
    } else {
        return res.status(403).send({success: false, error: 'No authentication token.'});
    }
});

getToken = function(headers) {
    if (headers && headers.authorization) {
        let parted = headers.authorization.split(' ');
        if (parted.length === 2) return parted[1];
        else return null;
    } else return null;
}

validToken = function(token) {
    let decoded = jwt.decode(token, config.secret);
    User.findOne({
        name: decoded.name
    }, function(err, user) {
        if (err) throw err;
        if (!user) return false, 'User not found';
        else return true, null;
    });
}

module.exports = router;
