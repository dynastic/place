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
                    pageDesc: `The terms of service that agreement to is required in order to participate in ${req.place.config.siteName}.`,
                    md: markdown
                });
            });
        }).catch(err => goNext());
    }).catch(err => goNext());
}

exports.getPrivacyPolicy = (req, res, next) => {
    TOSManager.hasPrivacyPolicy().then((hasTOS) => {
        if(!hasTOS) return next();
        TOSManager.getPrivacyPolicyContent().then((data) => {
            if(!data) return next();
            marked(data, (err, markdown) => {
                if(err || !markdown) return next();
                return req.responseFactory.sendRenderedResponse("public/markdown-document", {
                    pageTitle: "Privacy Policy",
                    pageDesc: `How Dynastic Development uses the data you submit to ${req.place.config.siteName}.`,
                    md: markdown
                });
            });
        }).catch(err => next());
    }).catch(err => next());
}