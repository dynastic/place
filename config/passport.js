const JwtStrategy = require('passport-jwt').Strategy,
    LocalStrategy = require('passport-local').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt;

// Get user model
const User = require('../models/user');
const config = require('../config/database');

module.exports = function(passport) {
    var opts = {};
    opts.jwtFromRequest = ExtractJwt.fromAuthHeader();
    opts.secretOrKey = config.secret;
    passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
        User.findOne({ _id: jwt_payload._id }, function(err, user) {
            if (err) return done(err, false);
            if (user) return done(null, user);
            done(null, false, { error: { message: "Invalid token.", code: "invalid_token" } });
        });
    }));

    passport.use(new LocalStrategy(function(username, password, done) {
        User.findOne({ name: username }, function(err, user) {
            if (err) return done(err, false);
            if (user) {
                return user.comparePassword(password, function(err, match) {
                    if (match && !err) return done(null, user);
                    done(null, false, { error: { message: "Incorrect username or password provided.", code: "invalid_credentials" } });
                });
            }
            done(null, false, { error: { message: "Incorrect username or password provided.", code: "invalid_credentials" } });
        });
    }));

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(user, done) {
        User.findById(user, function(err, user) {
            done(err, user);
        });
    });
}