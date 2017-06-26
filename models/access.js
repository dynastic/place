const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const User = require("./user");

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
        type: String
    },
    key: {
        type: String,
        required: false
    }
});

AccessSchema.methods.toInfo = function() {
    return {
        userID: this.userID,
        date: this.date,
        userAgent: this.userAgent,
        ipAddress: this.ipAddress
    };
}

AccessSchema.statics.recordAccess = function(app, userID, userAgent, ipAddress, key) {
    this.findOneAndUpdate({
        userID: userID,
        userAgent: userAgent,
        ipAddress: ipAddress,
        key: key
    }, {
        userID: userID,
        date: Date(),
        userAgent: userAgent,
        ipAddress: ipAddress,
        key: key
    }, { upsert: true }, (err, access) => {
        if(err) app.reportError("Couldn't record access attempt: " + err);
    });
}

AccessSchema.statics.findIPsForUser = function(user) {
    return new Promise((resolve, reject) => {
        this.find({userID: user._id}).then((accesses) => resolve(accesses.map((access) => access.ipAddress))).catch(reject);
    });
}

AccessSchema.statics.findSimilarIPUserIDs = function(user) {
    return new Promise((resolve, reject) => {
        this.findIPsForUser(user).then((ipAddresses) => {
            this.find({ ipAddress: { $in: ipAddresses }, userID: { $ne: user._id } }).then((accesses) => {
                var userIDs = accesses.map((access) => String(access.userID));
                resolve([...new Set(userIDs)]);
            }).catch(reject);
        }).catch(reject);
    });
}

module.exports = mongoose.model("Access", AccessSchema);