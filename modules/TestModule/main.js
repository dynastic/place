class Module {
    constructor(app) {
        this.app = app;
        this.meta = require('./module');
    }
}

module.exports = Module;