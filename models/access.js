const DataModelManager = require("../util/DataModelManager");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var AccessSchema = new Schema({
    userID: {
        type: Schema.ObjectId,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    userAgent: {
        type: String
    },
    ipAddress: {
        type: String,
        required: false
    },
    hashedIPAddress: {
        type: String,
        required: false
    },
    key: {
        type: String,
        required: false
    }
});

AccessSchema.methods.toInfo = function(userIDs = true) {
    var info = {
        date: this.date,
        userAgent: this.userAgent,
        ipAddress: this.hashedIPAddress
    };
    if (userIDs) info.userID = this.userID;
    return info;
}

AccessSchema.statics.getHashedIPAddress = function(ipAddress) {
    return crypto.createHash('sha256').update(ipAddress).digest('base64');
}

AccessSchema.statics.recordAccess = function(req, userID) {
    this.recordAccessInfo(req.place, userID, req.get("User-Agent"), req.get("X-Forwarded-For") || req.connection.remoteAddress, (typeof req.key !== "undefined" ? req.key : null));
}

AccessSchema.statics.recordAccessInfo = function(app, userID, userAgent, ipAddress, key) {
    var ipHash = this.getHashedIPAddress(ipAddress);
    this.findOneAndUpdate({
        userID: userID,
        userAgent: userAgent,
        hashedIPAddress: ipHash,
        key: key
    }, {
        userID: userID,
        date: Date(),
        userAgent: userAgent,
        hashedIPAddress: ipHash,
        key: key
    }, { upsert: true }, (err, access) => {
        if(err) app.reportError("Couldn't record access attempt: " + err);
    });
}

AccessSchema.statics.findIPsForUser = function(user) {
    return new Promise((resolve, reject) => {
        this.find({userID: user._id}).then((accesses) => resolve(accesses.map((access) => access.hashedIPAddress))).catch(reject);
    });
}

AccessSchema.statics.getUniqueIPsAndUserAgentsForUser = async function(user) {
    const accesses = await this.find({userID: user._id});
    // The [...new Set(array)] is filtering all duplicate strings, and I found it was the most efficient.
    const ipAddresses = [...new Set(accesses.map((access) => access.hashedIPAddress))];
    const userAgents = [...new Set(accesses.map((access) => access.userAgent))];
    const keys = [...new Set(accesses.map((access) => access.key))].filter((k) => k !== null);
    return {
        ipAddresses,
        userAgents,
        keys
    };
}

AccessSchema.statics.findSimilarIPUserIDs = function(user) {
    return new Promise((resolve, reject) => {
        this.findIPsForUser(user).then((ipAddresses) => {
            this.find({ hashedIPAddress: { $in: ipAddresses }, userID: { $ne: user._id } }).then((accesses) => {
                var userIDs = accesses.map((access) => String(access.userID));
                resolve([...new Set(userIDs)]);
            }).catch(reject);
        }).catch(reject);
    });
}

AccessSchema.methods.migrateIPAddress = function() {
    this.hashedIPAddress = AccessSchema.statics.getHashedIPAddress(this.ipAddress);
    this.ipAddress = null;
    return this.save();
}

module.exports = DataModelManager.registerModel("Access", AccessSchema);
