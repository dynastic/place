const User = require("../models/user");

exports.getOwnAccount = (req, res, next) => {
    res.redirect("/@" + req.user.name);
};

exports.getAccountByID = (req, res, next) => {
    User.findById(req.params.userID).then((user) => {
        res.redirect(`/@${user.name}`);
    }).catch((err) => next());
};

exports.getAccount = (req, res, next) => {
    User.findByUsername(req.params.username).then((user) => {
        if (!user || ((user.banned || user.deactivated) && !(req.user && (req.user.moderator || req.user.admin)))) return next();
        user.getInfo(req.place).then(async (info) => {
            if (req.user && req.user.admin) {
                const accessData = await user.getUniqueIPsAndUserAgents();
                user.ipAddresses = accessData.ipAddresses;
                user.userAgents = accessData.userAgents;
                user.keys = accessData.keys;
            }
            return req.responseFactory.sendRenderedResponse("public/account", { profileUser: user, profileUserInfo: info, hasNewPassword: req.query.hasNewPassword });
        });
    }).catch((err) => next());
};

exports.getAPIAccount = (req, res, next) => {
    function returnUserNotFound() {
        res.status(404).json({success: false, error: {code: "not_found", message: "We couldn't find that user."}});
    }
    User.findByUsername(req.params.username).then((user) => {
        if(!user) return returnUserNotFound();
        if((user.banned || user.deactivated) && !(req.user.moderator || req.user.admin)) return returnUserNotFound();
        user.getInfo(req.place).then((info) => res.json(info)).catch((err) => {console.log(err); returnUserNotFound() });
    }).catch((err) => returnUserNotFound());
};
