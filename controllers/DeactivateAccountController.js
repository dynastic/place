const ActionLogger = require("../util/ActionLogger");

exports.postAPIDeactivate = (req, res, next) => {
    if (!req.body.password) return res.status(400).json({success: false, error: {message: "The password field is required.", code: "invalid_parameters"}});
    req.user.comparePassword(req.body.password, (error, match) => {
        if(!match || error) return res.status(401).json({success: false, error: {message: "The password you entered was incorrect.", code: "incorrect_password"}});
        req.user.deactivated = true;
        ActionLogger.log(req.place, "deactivate", req.user);
        req.user.save();
        return res.json({success: true});
    });
};

exports.deleteAccount = (req, res, next) => {
    if (!req.body.password) return res.status(400).json({success: false, error: {message: "The password field is required.", code: "invalid_parameters"}});
    req.user.comparePassword(req.body.password, (error, match) => {
        if(!match || error) return res.status(401).json({success: false, error: {message: "The password you entered was incorrect.", code: "incorrect_password"}});

        req.user.markForDeletion();
        ActionLogger.log(req.place, "deleteAccount", req.user);
        req.logout();
        
        return res.json({success: true});
    });
};