const router = require('express').Router();
const config = require('../config/database');
const mongoose = require('mongoose');
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
                    res.json({success: true}); // create and return jwt token here
                } else { res.send({success: false, error: 'Incorrect username or password.'}); }
            });
        }
    })
});

module.exports = router;