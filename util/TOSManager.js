const path = require("path");
const fs = require("fs");
const md5 = require("md5");

const tosPath = path.join(__dirname, ".." + path.sep + "config" + path.sep + "tos.md");
var manager = {    
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
    }
}

module.exports = manager;