const express = require("express");
const passport = require("passport");
const OAuthController = require("../controllers/OAuthController");

function OAuthRouter(app) {
    require("../util/passport")(passport, app);
    let router = express.Router();

    if(typeof app.config.oauth !== "undefined") {
        if (app.config.oauth.google.enabled) {
            router.get("/google", OAuthController.getGoogle)
            router.get("/google/callback", passport.authenticate("google", { successRedirect: "/?signedin=1", failureRedirect: "/signup" }));
        }

        if (app.config.oauth.discord.enabled) {
            router.get("/discord", passport.authenticate("discord"));
            router.get("/discord/callback", passport.authenticate("discord", { successRedirect: "/?signedin=1", failureRedirect: "/signup" }));
        }

        if (app.config.oauth.facebook.enabled) {
            router.get("/facebook", passport.authenticate("facebook"));
            router.get("/facebook/callback", passport.authenticate("facebook", { successRedirect: "/?signedin=1", failureRedirect: "/signup" }));
        }

        if (app.config.oauth.github.enabled) {
            router.get("/github", passport.authenticate("github"));
            router.get("/github/callback", passport.authenticate("github", { successRedirect: "/?signedin=1", failureRedirect: "/signup" }));
        }

        if (app.config.oauth.reddit.enabled) {
            router.get("/reddit", OAuthController.getReddit);
            router.get("/reddit/callback", OAuthController.getRedditCallback);
        }

        if (app.config.oauth.twitter.enabled) {
            router.get("/twitter", passport.authenticate("twitter"));
            router.get("/twitter/callback", passport.authenticate("twitter", { successRedirect: "/?signedin=1", failureRedirect: "/signup" }));
        }

        if (app.config.oauth.microsoft.enabled) {
            router.get('/microsoft', passport.authenticate("microsoft"));
            router.get("/microsoft/callback", passport.authenticate("microsoft", { successRedirect: "/?signedin=1", failureRedirect: "/signup" }));
        }

        if (app.config.oauth.dynastic && app.config.oauth.dynastic.enabled) {
            router.get('/dynastic', passport.authenticate("dynastic", { state: "auth" }));
            router.get("/dynastic/callback", passport.authenticate("dynastic", { successRedirect: "/?signedin=1", failureRedirect: "/signup" }));
        }
    }

    return router;
}

OAuthRouter.prototype = Object.create(OAuthRouter.prototype);

module.exports = OAuthRouter;
