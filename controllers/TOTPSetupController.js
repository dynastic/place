const speakeasy = require("speakeasy");
const QRCode = require("QRCode");

exports.getTOTPSetup = function(req, res, next) {
    if(req.user.twoFactorAuthEnabled()) return res.status(403).json({success: false, error: {message: "You already have two-factor authentication set up on your account.", code: "totp_already_setup"}});
    var secret = speakeasy.generateSecret({length: 20});
    QRCode.toDataURL(secret.otpauth_url, function(err, data_url) {
        if(err) return res.status(500).json({success: false, error: {message: "An error occurred while trying to set up two-factor authentication on your account."}})
        res.json({success: true, totp: {secret: secret.base32, qrData: data_url}});
      });
}

exports.postTOTPSetup = function(req, res, next) {
    res.end();
}