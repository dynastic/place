const TOSManager = require("../util/TOSManager");
const marked = require("../util/Markdown");

exports.getTOS = (req, res, next, forcePage = false) => {
    function goNext() {
        if(forcePage) {
            res.status(500);
            return req.responseFactory.sendRenderedResponse("errors/500");
        }
        next();
    }
    TOSManager.hasTOS().then((hasTOS) => {
        if(!hasTOS) return goNext();
        TOSManager.getTOSContent().then((data) => {
            if(!data) return goNext();
            marked(data, (err, markdown) => {
                if(err || !markdown) return goNext();
                return req.responseFactory.sendRenderedResponse(forcePage ? "public/require-tos-accept" : "public/markdown-document", {
                    pageTitle: "Terms of Service",
                    pageDesc: "The terms of service that agreement to is required in order to participate in Place 2.0.",
                    md: markdown
                });
            });
        }).catch(err => goNext());
    }).catch(err => goNext());
}