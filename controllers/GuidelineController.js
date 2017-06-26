const fs = require("fs");
const marked = require("../util/Markdown");

exports.getGuidelines = (req, res, next) => {
    fs.readFile(__dirname + "/../config/community_guidelines.md", "utf8", (err, data) => {
        if(err || !data) return next();
        marked(data, (err, markdown) => {
            if(err || !markdown) return next();
            return req.responseFactory.sendRenderedResponse("public/guidelines", req, res, { md: markdown });
        });
    });
};