const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

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
    }
});

AccessSchema.methods.toInfo = function() {
    return {
        userID: this.userID,
        date: this.date,
        userAgent: this.userAgent,
        ipAddress: this.ipAddress
    }
}

AccessSchema.statics.recordAccess = function(userID, userAgent, ipAddress) {
    this.findOneAndUpdate({
        userID: userID,
        userAgent: userAgent,
        ipAddress: ipAddress
    }, {
        userID: userID,
        date: Date(),
        userAgent: userAgent,
        ipAddress: ipAddress
    }, { upsert: true }, (err, access) => {
        console.error("Couldn't record access attempt: " + err);
    });
}

module.exports = mongoose.model('Access', AccessSchema);