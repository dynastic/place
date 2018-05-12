const User = require("../models/user");
const Pixel = require("../models/pixel");
const ActionLogger = require("../util/ActionLogger");

exports.getAPIStats = (req, res, next) => {
    var signups24h = null, pixelsPlaced24h = null, pixelsPerMin = null;
    let dateBack24h = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
    let dateBack20m = new Date(new Date().getTime() - (20 * 60 * 1000));
    function finish() {
        return res.json({ success: true, stats: { online: req.place.websocketServer.connectedClients, signups24h: signups24h, pixelsPlaced24h: pixelsPlaced24h, pixelsPerMin: pixelsPerMin } });
    }
    function doPixelsPerMin() {
        Pixel.count({lastModified: {$gt: dateBack20m}}).then((c) => {
            pixelsPerMin = Math.round(c / 20);
            finish()
        }).catch((err) => finish());
    }
    function doPixelsPlaced24h() {
        Pixel.count({lastModified: {$gt: dateBack24h}}).then((c) => {
            pixelsPlaced24h = c;
            doPixelsPerMin()
        }).catch((err) => doPixelsPerMin());
    }
    function doSignups24h() {
        User.count({creationDate: {$gt: dateBack24h}}).then((c) => {
            signups24h = c;
            doPixelsPlaced24h()
        }).catch((err) => doPixelsPlaced24h());
    }
    doSignups24h();
};

exports.apiRefreshClients = (req, res, next) => {
    req.place.websocketServer.broadcast("reload_client");
    ActionLogger.log(req.place, "refreshClients", req.user);
    res.json({success: true});
};

exports.apiReloadConfig = (req, res, next) => {
    req.place.loadConfig();
    ActionLogger.log(req.place, "reloadConfig", req.user);
    res.json({success: true});
};

exports.apiBroadcastAlert = (req, res, next) => {
    if(!req.body.message || !req.body.timeout) return res.status(400).json({success: false});
    var timeout = Number.parseInt(req.body.timeout);
    if(Number.isNaN(timeout)) return res.status(400).json({success: false});
    var info = {
        title: req.body.title,
        message: req.body.message,
        timeout: Math.max(0, timeout),
        style: req.body.style || "info"
    };
    req.place.websocketServer.broadcast("admin_broadcast", info);
    ActionLogger.log(req.place, "sendBroadcast", req.user, null, info);
    res.json({success: true});
};

exports.deleteUser = (req, res, next) => {
    if(!req.params.userID || req.params.userID == "") return res.status(400).json({success: false, error: {message: "No user ID specified.", code: "bad_request"}});
    User.findById(req.params.userID).then((user) => {
        if(!req.user.canPerformActionsOnUser(user)) return res.status(403).json({success: false, error: {message: "You may not perform actions on this user.", code: "access_denied_perms"}});
        
        user.markForDeletion();
        ActionLogger.log(req.place, "delete", req.user, user);
        
        return res.json({success: true});
    }).catch((err) => res.status(400).json({success: false, error: {message: "No user with that ID exists.", code: "user_doesnt_exist"}}));
};