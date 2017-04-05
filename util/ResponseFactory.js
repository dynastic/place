const config = require("../config/config");

module.exports = {
    sendRenderedResponse: function(template, req, res, data, mimeType = "text/html") {
        var sendData = { url: req.url, path: req.path, config: config };
        if (typeof req.user !== undefined) sendData.user = req.user;
        if (typeof data !== 'undefined') {
            if (data) sendData = Object.assign({}, sendData, data);
        }
        return res.header("Content-Type", mimeType).render(template, sendData);
    }
}