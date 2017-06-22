const jwt = require('jwt-simple');
const passport = require('passport');
require('../util/passport')(passport);

exports.identifyAPIUser = (req, res, next) => {
    if (!req.body.username || !req.body.password) return res.status(400).json({ success: false, error: { message: 'A username and password are required.', code: 'invalid_parameters' } });
    passport.authenticate('local', { session: false }, function(err, user, info) {
        if (!user) return res.status(500).json({ success: false, error: info.error || { message: "An unknown error occurred." } });
        let token = jwt.encode(user, req.place.config.secret);
        res.json({ success: true, token: `JWT ${token}`, user: user.toInfo(req.place) }); // create and return jwt token here
    })(req, res, next);
}