exports.getAvailability = (req, res, next) => {
    var features = {
        colours: req.place.colours
    }
    if(req.user) features.user = req.user.getFeatureAvailability();
    res.json({
        success: true,
        availability: features
    });
}