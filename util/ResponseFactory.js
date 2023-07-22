const fs = require("fs");
const TOSManager = require("./TOSManager");

class ResponseFactory {
    constructor(app, req, res, root = "") {
        this.app = app;
        this.req = req;
        this.res = res;
        this.root = root;
    }

    sendRenderedResponse(template, data = null, mimeType = "text/html") {
        let sendData = this.getAutomaticTemplateData();
        if (data) sendData = Object.assign({}, sendData, data);
        return this.res.header("Content-Type", mimeType).render(this.root + template, sendData);
    }

    getAutomaticTemplateData() {
        let resources = this.req.place.moduleManager.getResourcesFromModules(this.req);
        let routerPath = this.req.baseUrl.substr(1);
        if(routerPath.length > 0) routerPath += "/";
        let redirectURLPart = this.req.path == "/signin" || this.req.path == "/signup" ? "" : encodeURIComponent(routerPath + this.req.url.substr(1));
        let path = this.req.baseUrl + this.req.path;
        let data = { url: this.req.url, path: path, config: this.app.config, fs: fs, renderCaptcha: () => this.app.recaptcha.render(), redirectURLPart: redirectURLPart, moduleManager: this.req.place.moduleManager, resources: resources, req: this.req, res: this.res, TOSManager: TOSManager };
        if (typeof this.req.user !== undefined && this.req.user) data.user = this.req.user;
        return data;
    }
}

ResponseFactory.prototype = Object.create(ResponseFactory.prototype);

module.exports = ResponseFactory;