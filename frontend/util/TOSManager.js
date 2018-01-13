const path = require("path");
const fs = require("fs");
const md5 = require("md5");

const configPath = path.join(__dirname, "..", "config");
const tosPath = path.join(configPath, "tos.md");
const ppPath = path.join(configPath, "privacy_policy.md");

class TOSManager {
    constructor() {
        this.cachedTOSVersion = null;
        this.refreshTOSVersion();
    }

    // Terms of Service

    hasTOSSync() {
        return fs.existsSync(tosPath);
    }
    
    hasTOS() {
        return new Promise((resolve, reject) => {
            fs.access(tosPath, (err) =>  resolve(err == null));
        });
    }
    
    getTOSContent() {
        return new Promise((resolve, reject) => {
            fs.readFile(tosPath, "utf8", (err, data) => {
                if(err || !data) return reject(err);
                resolve(data);
            });
        });
    }

    getCurrentTOSVersion(overrideCache = false) {
        return new Promise((resolve, reject) => {
            if(this.cachedTOSVersion != null && !overrideCache) return resolve(this.cachedTOSVersion);
            this.getTOSContent().then((content) => resolve(md5(content))).catch((err) => reject(err));
        })
    }
    
    refreshTOSVersion() {
        this.getCurrentTOSVersion(true).then((version) => {
            this.cachedTOSVersion = version;
            setTimeout(() => this.refreshTOSVersion(), 30000); // check TOS version every 30 seconds
        }).catch((err) => {
            console.error('TOS Manager', "Couldn't cache TOS version: " + err);
            setTimeout(() => this.refreshTOSVersion(), 30000); // check TOS version every 30 seconds
        })
    }

    // Privacy Policy

    hasPrivacyPolicySync() {
        return fs.existsSync(ppPath);
    }

    hasPrivacyPolicy() {
        return new Promise((resolve, reject) => {
            fs.access(ppPath, (err) =>  resolve(err == null));
        });
    }
    
    getPrivacyPolicyContent() {
        return new Promise((resolve, reject) => {
            fs.readFile(ppPath, "utf8", (err, data) => {
                if(err || !data) return reject(err);
                resolve(data);
            });
        });
    }

}

const instance = new TOSManager();

module.exports = instance;