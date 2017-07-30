const fs = require("fs");
const marked = require("../util/Markdown");
const path = require("path");

exports.getGuidelines = (req, res, next) => {
    const guidelinesLocalePath = path.join(process.cwd(), "config", `community_guidelines_${res.locale}.md`);
    const guidelinesDefaultPath = path.join(process.cwd(), "config", "community_guidelines.md");
    var guidelinesPath = null;

    if (!fs.existsSync(guidelinesLocalePath)) {
        console.warn(`Community guidelines has no locale for ${res.locale}`);
        guidelinesPath = guidelinesDefaultPath;
    } else guidelinesPath = guidelinesLocalePath;

    fs.readFile(guidelinesPath, "utf8", (err, data) => {
        if(err || !data) return next();
        marked(data, (err, markdown) => {
            if(err || !markdown) return next();
            return req.responseFactory.sendRenderedResponse("public/guidelines", req, res, { md: markdown });
        });
    });
};