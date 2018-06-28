const JwtStrategy = require("passport-jwt").Strategy,
    LocalStrategy = require("passport-local").Strategy,
    ExtractJwt = require("passport-jwt").ExtractJwt,
    GoogleStrategy = require("passport-google-oauth20").Strategy,
    RedditStrategy = require("passport-reddit").Strategy,
    DiscordStrategy = require("passport-discord").Strategy,
    TwitterStrategy = require("passport-twitter").Strategy,
    GithubStrategy = require("passport-github").Strategy,
    FacebookStrategy = require("passport-facebook").Strategy,
    DynasticStrategy = require("dynastic-provider").Strategy,
    MicrosoftStrategy = require("passport-microsoft").Strategy;

// Get user model
const User = require("../models/user");
const config = require("../config/config");
const ActionLogger = require("../util/ActionLogger");

module.exports = function(passport, app) {
    var opts = {};
    opts.jwtFromRequest = ExtractJwt.fromAuthHeader();
    opts.secretOrKey = config.secret;
    passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
        User.findOne({ _id: jwt_payload._id }, function(err, user) {
            if (err) return done(err, false);
            if (user) {
                if (user.loginError()) return done(null, false, { error: user.loginError() });                
                return done(null, user);
            }
            done(null, false, { error: { message: "Invalid token.", code: "invalid_token" } });
        });
    }));

    passport.use(new LocalStrategy(function(username, password, done) {
        function rejectCredentials() {
            done(null, false, { error: { message: "Incorrect username or password provided.", code: "invalid_credentials" } });
        }
        User.findByUsername(username, function(err, user) {
            if (err) return done(err, false);
            if (user) {
                // Don't allow Oauth logins from normal login area.
                if(user.isOauth === true) return rejectCredentials();
                if (user.loginError()) return done(null, false, { error: user.loginError() });
              
                if(user.passwordResetKey) {
                    if(user.passwordResetKey == password) return done(null, user);
                } else {
                    return user.comparePassword(password, function(err, match) {
                        if (match && !err) {
                            ActionLogger.log(app, "signIn", user, null, {method: "normal"});
                            return done(null, user);
                        }
                        rejectCredentials();
                    });
                }
            }
            rejectCredentials();
        });
    }));

    // Called by all OAuth providers. Logs user in and creates account in the database if it doesn't exist already
    function OAuthLogin(prefix, name, id, done) {
        User.findOne({ OAuthID: prefix + "_" + id }, function(err, user) {
            if(err) return done(err, false);
            if(user) {
                if(user.isOauth !== true) return done(null, false, { error: { message: "Incorrect username or password provided.", code: "invalid_credentials" } });
                ActionLogger.log(app, "signIn", user, null, {method: "oauth"});
                return done(null, user);
            }
            // Even though we don't use the password field, it's better to set it to *SOMETHING* unique
            User.register(prefix + "_" + id + "-" + Math.floor(Math.random() * 1000000), prefix + "_" + id, app, function(user, error) {
                if(!user) return done(null, false, error);
                done(null, user);
            }, prefix + "_" + id, name);
        });
    }

    if(typeof config.oauth !== "undefined") {
        if (config.oauth.google.enabled) {
            passport.use(new GoogleStrategy({
                clientID: config.oauth.google.clientID,
                clientSecret: config.oauth.google.clientSecret,
                callbackURL: config.host + "/auth/google/callback"
            }, function(req, accessToken, refreshToken, profile, done) {
                OAuthLogin("google", profile.displayName, profile.id, done);
            }));
        }

        if (config.oauth.reddit.enabled) {
            passport.use(new RedditStrategy({
                clientID: config.oauth.reddit.clientID,
                clientSecret: config.oauth.reddit.clientSecret,
                callbackURL: config.host + "/auth/reddit/callback"
            }, function(accessToken, refreshToken, profile, done) {
                OAuthLogin("reddit", profile.name, profile.id, done);
            }));
        }

        if (config.oauth.github.enabled) {
            passport.use(new GithubStrategy({
                clientID: config.oauth.github.clientID,
                clientSecret: config.oauth.github.clientSecret,
                callbackURL: config.host + "/auth/github/callback"
            }, function(accessToken, refreshToken, profile, done) {
                OAuthLogin("github", profile.username, profile.id, done);
            }));
        }

        if (config.oauth.facebook.enabled) {
            passport.use(new FacebookStrategy({
                clientID: config.oauth.facebook.clientID,
                clientSecret: config.oauth.facebook.clientSecret,
                callbackURL: config.host + "/auth/facebook/callback"
            }, function(accessToken, refreshToken, profile, done) {
                OAuthLogin("facebook", profile.displayName, profile.id, done);
            }));
        }

        if (config.oauth.discord.enabled) {
            passport.use(new DiscordStrategy({
                clientID: config.oauth.discord.clientID,
                clientSecret: config.oauth.discord.clientSecret,
                callbackURL: config.host + "/auth/discord/callback",
                scope: ["identify"]
            }, function(accessToken, refreshToken, profile, done) {
                OAuthLogin("discord", profile.username, profile.id, done);
            }));
        }

        if (config.oauth.twitter.enabled) {
            passport.use(new TwitterStrategy({
                consumerKey: config.oauth.twitter.clientID,
                consumerSecret: config.oauth.twitter.clientSecret,
                callbackURL: config.host + "/auth/twitter/callback"
            }, function(token, tokenSecret, profile, done) {
                OAuthLogin("twitter", profile.username, profile.id, done);
            }));
        }

        if (config.oauth.microsoft.enabled) {
            passport.use(new MicrosoftStrategy({
                clientID: config.oauth.microsoft.clientID,
                clientSecret: config.oauth.microsoft.clientSecret,
                callbackURL: config.host + '/auth/microsoft/callback',
                scope: ['openid']
            },
            function(accessToken, refreshToken, profile, done) {
                OAuthLogin("microsoft", profile.username, profile.id, done);
            }));
        }

        if (config.oauth.dynastic && config.oauth.dynastic.enabled) {
            passport.use(new DynasticStrategy({
                clientID: config.oauth.dynastic.clientID,
                clientSecret: config.oauth.dynastic.clientSecret,
                callbackURL: config.host + '/auth/dynastic/callback',
                frontendBaseURL: config.oauth.dynastic.frontendBaseURL,
                apiBaseURL: config.oauth.dynastic.apiBaseURL,
                scope: ['profile']
            },
            function(accessToken, refreshToken, profile, done) {
                OAuthLogin("dynastic", profile.name, profile.id, done);
            }));
        }
    }

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(user, done) {
        User.findById(user, (err, user) => done(err, user));
    });
}
