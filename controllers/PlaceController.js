const path = require("path");
const fs = require("fs");
const User = require("../models/user");

exports.postAPIPixel = (req, res, next) => {
    if (fs.existsSync(path.join(__dirname, "../util/", "legit.js"))) {
        const legit = require("../util/legit");
        if (!legit.verify(req)) return res.status(403).json({ success: false, error: { message: "You cannot do that.", code: "unauthorized" } });
    }
    function paintWithUser(user) {
        if (!user.canPlace(req.place)) return res.status(429).json({ success: false, error: { message: "You cannot place yet.", code: "slow_down" } });
        if (!req.body.x || !req.body.y || !req.body.colour) return res.status(400).json({ success: false, error: { message: "You need to include all paramaters", code: "invalid_parameters" } });
        var x = Number.parseInt(req.body.x), y = Number.parseInt(req.body.y);
        if(Number.isNaN(x) || Number.isNaN(y)) return res.status(400).json({ success: false, error: { message: "Your coordinates were incorrectly formatted", code: "invalid_parameters" } });
        var rgb = req.place.paintingManager.getColourRGB(req.body.colour);
        if (!rgb) return res.status(400).json({ success: false, error: { message: "Invalid colour code specified.", code: "invalid_parameters" } });
        req.place.paintingManager.doPaint(rgb, x, y, user).then((pixel) => {
            return User.findById(user.id).then((user) => {
                var seconds = user.getPlaceSecondsRemaining(req.place);
                var countData = { canPlace: seconds <= 0, seconds: seconds };
                return res.json({ success: true, timer: countData })
            }).catch((err) => res.json({ success: true }));
        }).catch((err) => {
            req.place.logger.capture(`Error placing pixel: ${err.message}`, { user: { id: user._id }, req: req });
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
