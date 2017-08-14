const path = require("path");
const fs = require("fs");
const md5 = require("md5");

const tosPath = path.join(__dirname, ".." + path.sep + "config" + path.sep + "tos.md");
const ppPath = path.join(__dirname, ".." + path.sep + "config" + path.sep + "privacy_policy.md");
var manager = {
    // Terms of Service

    hasTOSSync: function() {
        return fs.existsSync(tosPath);
    },
    
    hasTOS: function() {
        return new Promise((resolve, reject) => {
            fs.access(tosPath, (err) =>  resolve(err == null));
        });
    },
    
    getTOSContent: function() {
        return new Promise((resolve, reject) => {
            fs.readFile(tosPath, "utf8", (err, data) => {
                if(err || !data) return reject(err);
                resolve(data);
            });
        });
    },

    getCurrentTOSVersion: function() {
        return new Promise((resolve, reject) => {
            this.getTOSContent().then((content) => resolve(md5(content))).catch((err) => reject(err));
        })
    },

    // Privacy Policy

    hasPrivacyPolicySync: function() {
        return fs.existsSync(ppPath);
    },
    
    hasPrivacyPolicy: function() {
        return new Promise((resolve, reject) => {
            fs.access(ppPath, (err) =>  resolve(err == null));
        });
    },
    
    getPrivacyPolicyContent: function() {
        return new Promise((resolve, reject) => {
            fs.readFile(ppPath, "utf8", (err, data) => {
                if(err || !data) return reject(err);
                resolve(data);
            });
        });
    },

}

module.exports = manager;