const User = require("../models/user");
const ActionLogger = require("../util/ActionLogger");
const path = require("path");
const fs = require("fs");
const Action = require("../models/action");

exports.getAPIUsersTable = (req, res, next) => {
    let searchValue = req.body.search ? req.body.search.value || "" : "";
    var sort = { creationDate: "desc" };
    if(req.body.order && req.body.order.length > 0 && req.body.columns) {
        if(req.body.columns.length > req.body.order[0].column || 1) {
            let colName = req.body.columns[req.body.order[0].column].data;
            sort = {}, sort[colName] = req.body.order[0].dir || "desc";
        }
    }
    User.dataTables({
        limit: req.body.length || 25,
        skip: req.body.start || 0,
        select: ["id", "name", "creationDate", "admin", "moderator", "banned", "deactivated", "lastPlace", "placeCount", "totpSecret"],
        search: {
            value: searchValue,
            fields: ["name", "id"]
        }, sort: sort,
        processor: (data, row) => {
            data.hasTOTP = row.twoFactorAuthEnabled();
            delete data.totpSecret;
            return data;
        }
    }, (err, table) => {
        if(err) {
            req.place.reportError("Error trying to receive admin user table data.");
            return res.status(500).json({success: false});
        }
        User.find().count().then((c) => res.json(Object.assign({success: true, recordsTotal: c}, table))).catch((err) => {
            req.place.reportError("Error trying to receive user count for admin user table: " + err);
            res.status(500).json({success: false});
        });
    });
};

exports.postAPIToggleModerator = (req, res, next) => {
    if(!req.query.id) return res.status(400).json({success: false, error: {message: "No user ID specified.", code: "bad_request"}});
    if(req.query.id == req.user.id) return res.status(400).json({success: false, error: {message: "You may not change your own moderator status.", code: "cant_modify_self"}});
    User.findById(req.query.id).then((user) => {
        if(!req.user.canPerformActionsOnUser(user)) return res.status(403).json({success: false, error: {message: "You may not perform actions on this user.", code: "access_denied_perms"}});
        user.moderator = !user.moderator;
        user.save().then((user) => {
            ActionLogger.log(req.place, user.moderator ? "giveModerator" : "removeModerator", user, req.user);
            res.json({success: true, user: user.toInfo()})
        }).catch((err) => {
            req.place.reportError("Error trying to save moderator status on user: " + err);
            res.status(500).json({success: false});
        });
    }).catch((err) => {
        req.place.reportError("Error trying to get user to set moderator status on: " + err);
        res.status(500).json({success: false})
    });
};

exports.postAPIToggleBan = (req, res, next) => {
    if(!req.query.id) return res.status(400).json({success: false, error: {message: "No user ID specified.", code: "bad_request"}});
    if(req.query.id == req.user.id) return res.status(400).json({success: false, error: {message: "You may not ban yourself.", code: "cant_modify_self"}});
    User.findById(req.query.id).then((user) => {
        if(!req.user.canPerformActionsOnUser(user)) return res.status(403).json({success: false, error: {message: "You may not perform actions on this user.", code: "access_denied_perms"}});
        var info = null;
        if(!user.banned) {
            // We're trying to ban the user
            if(!req.query.reason || req.query.reason.length <= 3) return res.status(400).json({success: false, error: {message: "Make sure you have specified a ban reason that is over three characters in length.", code: "invalid_reason"}});
            info = {reason: req.query.reason};
        }
        user.banned = !user.banned;
        user.save().then((user) => {
            ActionLogger.log(req.place, user.banned ? "ban" : "unban", user, req.user, info);
            res.json({success: true, user: user.toInfo()})
        }).catch((err) => {
            req.place.reportError("Error trying to save banned status on user: " + err);
            res.status(500).json({success: false})
        });
    }).catch((err) => {
        req.place.reportError("Error trying to get user to set banned status on: " + err);
        res.status(500).json({success: false});
    });
};

exports.postAPIToggleActive = (req, res, next) => {
    if(!req.query.id) return res.status(400).json({success: false, error: {message: "No user ID specified.", code: "bad_request"}});
    User.findById(req.query.id).then((user) => {
        if(!req.user.canPerformActionsOnUser(user)) return res.status(403).json({success: false, error: {message: "You may not perform actions on this user.", code: "access_denied_perms"}});
        user.deactivated = !user.deactivated;
        user.save().then((user) => {
            ActionLogger.log(req.place, user.deactivated ? "deactivateOther" : "activateOther", user, req.user);
            res.json({success: true, user: user.toInfo()})
        }).catch((err) => {
            req.place.reportError("Error trying to save activation status on user: " + err);
            res.status(500).json({success: false})
        });
    }).catch((err) => {
        req.place.reportError("Error trying to get user to set activation status on: " + err);
        res.status(500).json({success: false});
    });
};

exports.getAPIUserNotes = (req, res, next) => {
    if(!req.query.id) return res.status(400).json({success: false, error: {message: "No user ID specified.", code: "bad_request"}});
    User.findById(req.query.id, {userNotes: 1}).then((user) => {
        res.json({success: true, userNotes: user.userNotes || ""})
    }).catch((err) => {
        req.place.reportError("Error trying to get user to retrieve user notes of user: " + err);
        res.status(500).json({success: false});
    });
};

exports.postAPIUserNotes = (req, res, next) => {
    if(!req.query.id) return res.status(400).json({success: false, error: {message: "No user ID specified.", code: "bad_request"}});
    User.findById(req.query.id).then((user) => {
        user.userNotes = req.body.notes;
        user.save().then((user) => {
            ActionLogger.log(req.place, "updateNotes", user, req.user);
            res.json({success: true, user: user.toInfo()})
        }).catch((err) => {
            req.place.reportError("Error trying to save user notes: " + err);
            res.status(500).json({success: false})
        });
    }).catch((err) => {
        req.place.reportError("Error trying to get user to set user notes on: " + err);
        res.status(500).json({success: false});
    });
};

exports.getAPISimilarUsers = (req, res, next) => {
    if(!req.params.userID || req.params.userID == "") return res.status(400).json({success: false, error: {message: "No user ID specified.", code: "bad_request"}});
    User.findById(req.params.userID).then((user) => {
        if(!req.user.canPerformActionsOnUser(user)) return res.status(403).json({success: false, error: {message: "You may not perform actions on this user.", code: "access_denied_perms"}});
        user.findSimilarIPUsers().then((users) => {
            var identifiedAccounts = users.map((user) => { return { user: user.toInfo(req.place), reasons: ["ip"] }; });
            function respondIdentifiedAccounts() {
                res.json({ success: true, target: user.toInfo(req.place), identifiedAccounts: identifiedAccounts })
            }
            if (fs.existsSync(path.join(__dirname, "../util/", "legit.js"))) {
                const legit = require("../util/legit");
                var currentUsernames = identifiedAccounts.map((i) => i.user.username);
                legit.findSimilarUsers(user).then((users) => {
                    var reason = legit.similarityAspectName();
                    users.forEach((user) => {
                        if(currentUsernames.includes(user.name)) {
                            var i = currentUsernames.indexOf(user.name);
                            identifiedAccounts[i].reasons.push(reason);
                        } else identifiedAccounts.push({ user: user.toInfo(req.place), reasons: [reason] });
                    });
                    respondIdentifiedAccounts();
                }).catch((err) => respondIdentifiedAccounts());
            } else respondIdentifiedAccounts();
        }).catch((err) => {
            req.place.reportError("Error finding similar accounts: " + err);
            res.status(500).json({ success: false });
        });
    }).catch((err) => res.status(400).json({success: false, error: {message: "No user with that ID exists.", code: "user_doesnt_exist"}}));
};

exports.getAPIActions = (req, res, next) => {
    var condition = { actionID: { $in: ActionLogger.actionIDsToRetrieve(req.query.modOnly === "true") } };
    if (req.query.lastID) condition._id = { $lt: req.query.lastID };
    else if (req.query.firstID) condition._id = { $gt: req.query.firstID };
    Action.find(condition, null, {sort: {_id: -1}}).limit(Math.min(250, req.query.limit || 25)).then((actions) => {
        var lastID = null;
        if(actions.length > 1) lastID = actions[actions.length - 1]._id;
        var promises = actions.map((a) => a.getInfo());
        Promise.all(promises).then((actions) => res.json({ success: true, actions: actions, lastID: lastID, actionTemplates: ActionLogger.getAllActionInfo() })).catch((err) => res.status(500).json({ success: false }))
    }).catch((err) => {
        req.place.reportError("An error occurred while trying to retrieve actions: " + err);
        res.status(500).json({ success: false });
    });
};

exports.postAPIDisableTOTP = (req, res, next) => {
    if(!req.query.id) return res.status(400).json({success: false, error: {message: "No user ID specified.", code: "bad_request"}});
    User.findById(req.query.id).then((user) => {
        if(!req.user.canPerformActionsOnUser(user)) return res.status(403).json({success: false, error: {message: "You may not perform actions on this user.", code: "access_denied_perms"}});
        if(!user.twoFactorAuthEnabled()) return res.status(400).json({success: false, error: {message: "This user doesn't have two-factor authentication enabled.", code: "totp_not_enabled"}});
        user.totpSecret = null;
        user.save().then((user) => {
            ActionLogger.log(req.place, "disableTOTP", user, req.user);
            res.json({success: true, user: {hasTOTP: false}});
        }).catch((err) => {
            req.place.reportError("Error trying to disable two-factor authentication for user: " + err);
            res.status(500).json({success: false});
        });
    }).catch((err) => {
        req.place.reportError("Error trying to get user to disable two-factor authentication on: " + err);
        res.status(500).json({success: false})
    });
}

exports.postAPIForcePasswordReset = (req, res, next) => {
    if(!req.query.id || !req.query.key) return res.status(400).json({success: false, error: {message: "No user ID or password reset key specified.", code: "bad_request"}});
    User.findById(req.query.id).then((user) => {
        if(!req.user.canPerformActionsOnUser(user)) return res.status(403).json({success: false, error: {message: "You may not perform actions on this user.", code: "access_denied_perms"}});
        user.passwordResetKey = req.query.key;
        user.save().then((user) => {
            ActionLogger.log(req.place, "forcePWReset", user, req.user);
            res.json({success: true, user: user.toInfo()});
        }).catch((err) => {
            req.place.reportError("Error trying to force a password reset for user: " + err);
            res.status(500).json({success: false});
        });
    }).catch((err) => {
        req.place.reportError("Error trying to get user to force a password reset on: " + err);
        res.status(500).json({success: false})
    });
}