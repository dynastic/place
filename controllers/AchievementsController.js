const User = require("../models/user");

exports.getUserAchievements = (req, res, next) => {
    if (!req.params.username) return res.status(400).json({success: false});
    const name = req.params.username;
    User.findOne({name}).then(user => {
        user.getAchievements().then(achievements => {
            res.json({achievements});
        });
    });
}