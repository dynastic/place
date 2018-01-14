const Warp = require("../models/warp");

exports.getWarps = (req, res, next) => {
    Warp.find({userID: req.user.id}).then((warps) => {
        res.json({success: true, warps: warps.sort((a, b) => b.creationDate - a.creationDate).map((w) => w.toInfo())});
    }).catch((err) => {
        req.place.logger.error("Couldn't get warps for user: " + err);
        res.json({success: false, error: {message: "An unknown error occurred while trying to retrieve your warps.", code: "server_error"}});
    });
};

exports.postWarp = (req, res, next) => {
    if(!req.body.x || !req.body.y || !req.body.name) return res.status(400).json({success: false, error: {message: "You didn't specify the coordinates or name to create the warp with.", code: "bad_request"}});
    Warp.createWarp(req.body.x, req.body.y, req.body.name, req.user.id, (warp, err) => {
        if(!warp) return res.status(400).json({success: false, error: err});
        res.json({success: true, warp: warp.toInfo()});
    });
};

exports.getWarp = (req, res, next) => {
    if(!req.params.id) return res.status(400).json({success: false, error: {message: "You didn't specify the warp to retrieve.", code: "bad_request"}});
    Warp.findOne({userID: req.user.id, id: req.params.id}).then((warp) => {
        if(!warp) return res.status(404).json({success: false, error: {message: "An accessible warp with that ID doesn't exist.", code: "not_found"}});
        res.json({success: true, warp: warp.toInfo()});
    }).catch((err) => res.status(500).json({success: false}));
};

exports.deleteWarp = (req, res, next) => {
    if(!req.params.id) return res.status(400).json({success: false, error: {message: "You didn't specify the warp to delete.", code: "bad_request"}});
    Warp.findOneAndRemove({userID: req.user.id, _id: req.params.id}).then((warp) => {
        if(!warp) return res.status(404).json({success: false, error: {message: "An accessible warp with that ID doesn't exist.", code: "not_found"}});
        res.json({success: true});
    }).catch((err) => res.status(500).json({success: false}));
};