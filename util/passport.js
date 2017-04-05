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

    passport.use(new GoogleStrategy({
        clientID: config.google.clientID,
        clientSecret: config.google.clientSecret,
        callbackURL: config.baseURL + "/auth/google/callback"
    }, function(req, accessToken, refreshToken, profile, done) {
        function renderResponse(errorMsg) {
            return responseFactory.sendRenderedResponse("public/signup", req, req.res, { captcha: app.recaptcha.render(), error: { message: errorMsg || "An unknown error occurred" }, username: "" });
        }
        User.findOne({ name: "google_" + profile.id }, function(err, user) {
            if(err) return done(err, false);
            if(user) {
                if(user.isOauth !== true) return done(null, false, { error: { message: "Incorrect username or password provided.", code: "invalid_credentials" } });
                return done(null, user);
            }
            // Even though we don't use the password field, it's better to set it to *SOMETHING* unique
            User.register("google_" + profile.id, "google_" + profile.id, function(user, error) {
                if(!user) return done(null, false, error);
                done(null, user);
            }, profile.displayName);
        });
    }));

    passport.use(new RedditStrategy({
        clientID: config.reddit.clientID,
        clientSecret: config.reddit.clientSecret,
        callbackURL: "http://localhost:3000/auth/reddit/callback"
    }, function(accessToken, refreshToken, profile, done) {
        function renderResponse(errorMsg) {
            return responseFactory.sendRenderedResponse("public/signup", req, req.res, { captcha: app.recaptcha.render(), error: { message: errorMsg || "An unknown error occurred" }, username: "" });
        }
        User.findOne({ name: "reddit_" + profile.id }, function(err, user) {
            if(err) return done(err, false);
            if(user) {
                if(user.isOauth !== true) return done(null, false, { error: { message: "Incorrect username or password provided.", code: "invalid_credentials" } });
                return done(null, user);
            }
            // Even though we don't use the password field, it's better to set it to *SOMETHING* unique
            User.register("reddit_" + profile.id, "reddit_" + profile.id, function(user, error) {
                if(!user) return done(null, false, error);
                done(null, user);
            }, profile.name);
        });
    }));

    passport.use(new DiscordStrategy({
        clientID: config.discord.clientID,
        clientSecret: config.discord.clientSecret,
        callbackURL: "http://localhost:3000/auth/discord/callback",
        scope: ["identify"]
    }, function(accessToken, refreshToken, profile, done) {
        function renderResponse(errorMsg) {
            return responseFactory.sendRenderedResponse("public/signup", req, req.res, { captcha: app.recaptcha.render(), error: { message: errorMsg || "An unknown error occurred" }, username: "" });
        }
        User.findOne({ name: "discord_" + profile.id }, function(err, user) {
            if(err) return done(err, false);
            if(user) {
                if(user.isOauth !== true) return done(null, false, { error: { message: "Incorrect username or password provided.", code: "invalid_credentials" } });
                return done(null, user);
            }
            // Even though we don't use the password field, it's better to set it to *SOMETHING* unique
            User.register("discord_" + profile.id, "discord_" + profile.id, function(user, error) {
                if(!user) return done(null, false, error);
                done(null, user);
            }, profile.username);
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