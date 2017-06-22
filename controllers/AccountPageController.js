const User = require('../models/user');

exports.getOwnAccount = (req, res, next) => {
    if (!req.user) return res.redirect("/signin");
    res.redirect("/@" + req.user.name);
}

exports.getAccountByID = (req, res, next) => {
    User.findById(req.params.userID).then(user => {
        res.redirect(`/@${user.name}`);
    }).catch(err => next())
}

exports.getAccount = (req, res, next) => {
    User.findByUsername(req.params.username).then(user => {
        if((user.banned || user.deactivated) && !(req.user.moderator || req.user.admin)) return next();
        user.getInfo(req.place).then(info => {
            return req.responseFactory.sendRenderedResponse("public/account", req, res, { profileUser: user, profileUserInfo: info, hasNewPassword: req.query.hasNewPassword });
        }).catch(err => next());
    }).catch(err => next())
}