module.exports = {
    sendRenderedResponse: function(template, req, res) {
        return res.render(template, { url: req.url, path: req.path })
    }
}