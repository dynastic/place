exports.getAvailability = (req, res, next) => {
    var features = {
        colours: req.place.colours,
        flags: req.place.config.pixelFlags || []
    }
    if(req.user) features.user = req.user.getFeatureAvailability();
    res.json({
        success: true,
        availability: features
    });
}

exports.betaSignup = (req, res, next) => {
    if (req.user.tester) return res.json({ success: true });

    req.user.update({ tester: true }, (err, user) => {
        if (err) return res.status(500).json({ success: false });
        return res.json({ success: true });
    });
}