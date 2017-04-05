const JwtStrategy = require('passport-jwt').Strategy,
    LocalStrategy = require('passport-local').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt,
    GoogleStrategy = require('passport-google-oauth20').Strategy,
    RedditStrategy = require('passport-reddit').Strategy,
    DiscordStrategy = require('passport-discord').Strategy;

// Get user model
const User = require('../models/user');
const config = require('../config/config');

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
                // Don't allow Oauth logins from normal login area.
                if(user.isOauth === true) return done(null, false, { error: { message: "Incorrect username or password provided.", code: "invalid_credentials" } });
                return user.comparePassword(password, function(err, match) {
                    if (match && !err) return done(null, user);
                    done(null, false, { error: { message: "Incorrect username or password provided.", code: "invalid_credentials" } });
                });
            }
            done(null, false, { error: { message: "Incorrect username or password provided.", code: "invalid_credentials" } });
        });
    }));

    // Called by all OAuth providers. Logs user in and creates account in the database if it doesn't exist already
    function OAuthLogin(prefix, name, id, done) {
        User.findOne({ name: prefix + "_" + id }, function(err, user) {
            if(err) return done(err, false);
            if(user) {
                if(user.isOauth !== true) return done(null, false, { error: { message: "Incorrect username or password provided.", code: "invalid_credentials" } });
                return done(null, user);
            }
            // Even though we don't use the password field, it's better to set it to *SOMETHING* unique
            User.register(prefix + "_" + id, prefix + "_" + id, function(user, error) {
                if(!user) return done(null, false, error);
                done(null, user);
            }, name);
        });
    }

    passport.use(new GoogleStrategy({
        clientID: config.google.clientID,
        clientSecret: config.google.clientSecret,
        callbackURL: config.baseURL + "/auth/google/callback"
    }, function(req, accessToken, refreshToken, profile, done) {
        OAuthLogin("google", profile.displayName, profile.id, done);
    }));

    passport.use(new RedditStrategy({
        clientID: config.reddit.clientID,
        clientSecret: config.reddit.clientSecret,
        callbackURL: "http://localhost:3000/auth/reddit/callback"
    }, function(accessToken, refreshToken, profile, done) {
        OAuthLogin("reddit", profile.name, profile.id, done);
    }));

    passport.use(new DiscordStrategy({
        clientID: config.discord.clientID,
        clientSecret: config.discord.clientSecret,
        callbackURL: "http://localhost:3000/auth/discord/callback",
        scope: ["identify"]
    }, function(accessToken, refreshToken, profile, done) {
        OAuthLogin("discord", profile.username, profile.id, done);
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