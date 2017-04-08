const config = require("../config/config");

function ResponseFactory(root = "") {
    return {
        sendRenderedResponse: function(template, req, res, data, mimeType = "text/html") {
            var sendData = { url: req.url, path: root + req.path, config: config };
            if (typeof req.user !== undefined) sendData.user = req.user;
            if (typeof data !== 'undefined') {
                if (data) sendData = Object.assign({}, sendData, data);
            }
            return res.header("Content-Type", mimeType).render(template, sendData);
        }
    }
}


ResponseFactory.prototype = Object.create(ResponseFactory.prototype);

module.exports = ResponseFactory;