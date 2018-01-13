const path = require("path");
const fs = require("fs");
const User = require("../models/user");

exports.postAPIPixel = (req, res, next) => {
    if (fs.existsSync(path.join(__dirname, "../util/", "legit.js"))) {
        if (!req.pass) return res.status(403).json({ success: false, error: { message: "You cannot do that.", code: "unauthorized" } });
    }
    function paintWithUser(user) {
        if (!user.canPlace(req.place)) return res.status(429).json({ success: false, error: { message: "You cannot place yet.", code: "slow_down" } });
        if (!req.body.x || !req.body.y || !req.body.hex) return res.status(400).json({ success: false, error: { message: "You need to include all paramaters", code: "invalid_parameters" } });
        var x = Number.parseInt(req.body.x), y = Number.parseInt(req.body.y);
        if(Number.isNaN(x) || Number.isNaN(y)) return res.status(400).json({ success: false, error: { message: "Your coordinates were incorrectly formatted", code: "invalid_parameters" } });
        if (!user.canPlaceColour(req.body.hex, req.place)) return res.status(400).json({ success: false, error: { message: "You can't place that colour.", code: "disallowed_colour" } });
        var rgb = req.place.paintingManager.getColourRGB(req.body.hex);
        req.place.paintingManager.doPaint(rgb, x, y, user).then((pixel) => {
            return User.findById(user.id).then((user) => {
                var seconds = user.getPlaceSecondsRemaining(req.place);
                var countData = { canPlace: seconds <= 0, seconds: seconds };
                return res.json({ success: true, timer: countData })
            }).catch((err) => res.json({ success: true }));
        }).catch((err) => {
            req.place.logger.capture(`Error placing pixel: ${err.message}`, { user: user });
            res.status(500).json({ success: false, error: err })
        });
    }
    paintWithUser(req.user);
};

exports.getAPITimer = (req, res, next) => {
    function getTimerPayload(user) {
        var seconds = user.getPlaceSecondsRemaining(req.place);
        var countData = { canPlace: seconds <= 0, seconds: seconds };
        return { success: true, timer: countData };
    }
    return res.json(getTimerPayload(req.user));
};
