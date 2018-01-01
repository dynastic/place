const User = require("../models/user");

const handleBadRequest = (res, e) => {
    console.error(e);
    res.status(500).json({success: false, error: {message: "An error occurred while processing your request"}});
}

exports.getUserAchievements = (req, res, next) => {
    if (!req.params.username) return res.status(400).json({success: false, error: {code: "bad_request", message: "The username parameter is rqeuired."}});
    const name = req.params.username;
    User.findByUsername(name).then(user => {
        if (!user) {
            return res.status(404).json({success: false, error: {code: "not_found", message: "The username provided does not match any registered users."}});
        }
        user.getAchievements().then(achievements => {
            res.json({achievements, success: true});
        }).catch((e) => handleBadRequest(res, e));
    }).catch((e) => handleBadRequest(res, e));
}