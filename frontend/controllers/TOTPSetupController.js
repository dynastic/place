const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

exports.getTOTPSetup = function(req, res, next) {
    if(req.user.twoFactorAuthEnabled()) return res.status(403).json({success: false, error: {message: "You already have two-factor authentication set up on your account.", code: "totp_already_setup"}});
    var secret = speakeasy.generateSecret({length: 20, issuer: req.place.config.siteName, name: req.user.name});
    var url = speakeasy.otpauthURL({secret: secret.ascii, label: req.user.name, issuer: req.place.config.siteName});
    QRCode.toDataURL(url, function(err, data_url) {
        if(err) return res.status(500).json({success: false, error: {message: "An error occurred while trying to set up two-factor authentication on your account."}})
        res.json({success: true, totp: {secret: secret.base32, qrData: data_url, authURL: url}});
    });
}

exports.postTOTPSetup = function(req, res, next) {
    if(req.user.twoFactorAuthEnabled()) return res.status(403).json({success: false, error: {message: "You already have two-factor authentication set up on your account.", code: "totp_already_setup"}});
    if(!req.body.secret || !req.body.token) return res.status(400).json({success: false, error: {message: "You didn't provide the required data.", code: "bad_request"}});
    if(!speakeasy.totp.verify({secret: req.body.secret, encoding: 'base32', token: req.body.token, window: 6})) {
        console.log(`REJECTING TOTP CODE: "${req.body.token}"`)
        return res.status(403).json({success: false, error: {message: "The token you inputted is not valid for the QR code on screen.", code: "invalid_totp_token"}});
    }
    req.user.totpSecret = req.body.secret;
    req.user.save().then(() => res.json({success: true})).catch((err) => {
        req.place.reportError("Couldn't enable user TOTP auth: " + err);
        res.status(500).json({success: false});
    })
}

exports.deleteTOTPSetup = function(req, res, next) {
    if(!req.user.twoFactorAuthEnabled()) return res.status(403).json({success: false, error: {message: "You don't have two-factor authentication set up on your account.", code: "totp_not_setup"}});
    req.user.totpSecret = null;
    req.user.save().then(() => res.json({success: true})).catch((err) => {
        req.place.reportError("Couldn't disable user TOTP auth: " + err);
        res.status(500).json({success: false});
    })
}