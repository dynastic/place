module.exports = {
    sendRenderedResponse: function(template, req, res, data) {
        var sendData = { url: req.url, path: req.path };
        if (typeof req.user !== undefined) sendData.user = req.user;
        if (typeof data !== 'undefined') {
            if (data) sendData = Object.assign({}, sendData, data);
        }
        return res.render(template, sendData);
    }
}